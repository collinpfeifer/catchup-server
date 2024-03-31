import { createSchema } from 'graphql-yoga';
import type {
  User,
  Answer,
  Question,
  AnonUser,
  QuestionType,
  AnswerType,
} from '@prisma/client';
import { GraphQLContext } from './context';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { APP_SECRET } from './auth';
import { z } from 'zod';

const typeDefs = /* GraphQL */ `
  type Query {
    user(id: ID!): User
    users: [User!]!
    userByPhoneNumber(phoneNumber: String!): User
    anonUser(id: ID!): AnonUser
    anonUsers: [AnonUser!]!
    anonUserByPhoneNumber(phoneNumber: String!): AnonUser
    question(id: ID!): Question
    questionOfTheDay: Question
    userAnswerExists(userId: ID!, questionId: ID!): Boolean
    questions: [Question!]!
    answer(id: ID!): Answer
    answers: [Answer!]!
  }

  type Mutation {
    login(phoneNumber: String!, password: String!): AuthPayload
    logout: Boolean
    signUp(name: String!, phoneNumber: String!, password: String!): AuthPayload
    refreshToken(refreshToken: String!): AuthPayload
    sendSMSVerificationCode(phoneNumber: String!): Boolean
    verifySMSCode(phoneNumber: String!, code: String!): Boolean
    createAnonUser(phoneNumber: String!): AnonUser
    createQuestion(question: String!): Question
    answerQuestion(id: ID!, answer: String, type: AnswerType): Answer
  }

  type AuthPayload {
    token: String
    refreshToken: String
    user: User
  }

  union AnswerUser = User | AnonUser

  enum AnswerType {
    TEXT
    USER
    ANON_USER
  }

  enum QuestionType {
    TEXT
    USER
  }

  type User {
    id: ID!
    name: String!
    phoneNumber: String!
    password: String!
    createdAt: String!
    updatedAt: String!
    refreshToken: String!
    answers: [Answer!]!
    appearsIn: [Answer!]!
  }

  type AnonUser {
    id: ID!
    phoneNumber: String!
    appearsIn: [Answer!]!
    createdAt: String!
    updatedAt: String!
  }

  type Question {
    id: ID!
    type: QuestionType!
    question: String!
    createdAt: String!
    updatedAt: String!
    answers: [Answer!]!
    responses: Int!
    nextQuestion: Question
    previousQuestion: Question
  }

  type Answer {
    id: ID!
    question: Question!
    user: User!
    type: AnswerType!
    createdAt: String!
    updatedAt: String!
    answerUser: AnswerUser
    textAnswer: String
  }
`;

const resolvers = {
  User: {
    id: (parent: User) => parent.id,
    name: (parent: User) => parent.name,
    phoneNumber: (parent: User) => parent.phoneNumber,
    password: (parent: User) => parent.password,
    createdAt: (parent: User) => parent.createdAt,
    updatedAt: (parent: User) => parent.updatedAt,
    refreshToken: (parent: User) => parent.refreshToken,
    answers: async (parent: User, args: {}, context: GraphQLContext) =>
      await context.prisma.answer.findMany({
        where: { userId: parent.id },
      }),
    appearsIn: async (parent: User, args: {}, context: GraphQLContext) =>
      await context.prisma.answer.findMany({
        where: { userAnswerId: parent.id },
      }),
  },
  AnonUser: {
    id: (parent: AnonUser) => parent.id,
    phoneNumber: (parent: AnonUser) => parent.phoneNumber,
    createdAt: (parent: AnonUser) => parent.createdAt,
    updatedAt: (parent: AnonUser) => parent.updatedAt,
    appearsIn: async (parent: AnonUser, args: {}, context: GraphQLContext) =>
      await context.prisma.answer.findMany({
        where: { anonUserAnswerId: parent.id },
      }),
  },
  Question: {
    id: (parent: Question) => parent.id,
    type: (parent: Question) => parent.type,
    question: (parent: Question) => parent.question,
    createdAt: (parent: Question) => parent.createdAt,
    updatedAt: (parent: Question) => parent.updatedAt,
    answers: async (parent: Question, args: {}, context: GraphQLContext) =>
      await context.prisma.answer.findMany({
        where: { questionId: parent.id },
      }),
    responses: async (parent: Question, args: {}, context: GraphQLContext) =>
      parent.responses,
    nextQuestion: async (parent: Question, args: {}, context: GraphQLContext) =>
      parent.nextQuestionId
        ? await context.prisma.question.findUnique({
            where: { id: parent.nextQuestionId },
          })
        : null,
  },
  Answer: {
    id: (parent: Answer) => parent.id,
    question: async (parent: Answer, args: {}, context: GraphQLContext) =>
      await context.prisma.question.findUnique({
        where: { id: parent.questionId },
      }),
    user: async (parent: Answer, args: {}, context: GraphQLContext) =>
      await context.prisma.user.findUnique({
        where: { id: parent.userId },
      }),
    createdAt: (parent: Answer) => parent.createdAt,
    updatedAt: (parent: Answer) => parent.updatedAt,
    answerUser: async (parent: Answer, args: {}, context: GraphQLContext) => {
      if (parent.type === 'USER') {
        if (parent.userAnswerId === null) return null;
        return {
          __typename: 'User',
          ...(await context.prisma.user.findUnique({
            where: { id: parent.userAnswerId },
          })),
        };
      } else if (parent.type === 'ANON_USER') {
        if (parent.anonUserAnswerId === null) return null;
        return {
          __typename: 'AnonUser',
          ...(await context.prisma.anonUser.findUnique({
            where: { id: parent.anonUserAnswerId },
          })),
        };
      }
    },

    textAnswer: (parent: Answer) => parent.textAnswer,
  },

  Query: {
    user: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => await context.prisma.user.findUnique({ where: { id: args.id } }),
    users: async (parent: unknown, args: {}, context: GraphQLContext) =>
      await context.prisma.user.findMany(),
    userByPhoneNumber: async (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) =>
      await context.prisma.user.findUnique({
        where: { phoneNumber: args.phoneNumber },
      }),
    anonUser: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => await context.prisma.anonUser.findUnique({ where: { id: args.id } }),
    anonUsers: async (parent: unknown, args: {}, context: GraphQLContext) =>
      await context.prisma.anonUser.findMany(),
    anonUserByPhoneNumber: async (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) =>
      await context.prisma.anonUser.findUnique({
        where: { phoneNumber: args.phoneNumber },
      }),
    question: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => await context.prisma.question.findUnique({ where: { id: args.id } }),
    questionOfTheDay: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => await context.prisma.question.findFirst(),
    questions: async (parent: unknown, args: {}, context: GraphQLContext) =>
      await context.prisma.question.findMany(),
    answer: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => await context.prisma.answer.findUnique({ where: { id: args.id } }),
    userAnswerExists: async (
      parent: unknown,
      args: { userId: string; questionId: string },
      context: GraphQLContext
    ) => {
      const found = await context.prisma.answer.findFirst({
        where: { userId: args.userId, questionId: args.questionId },
      });
      return Boolean(found);
    },
    answers: async (parent: unknown, args: {}, context: GraphQLContext) =>
      await context.prisma.answer.findMany(),
  },
  Mutation: {
    login: async (
      parent: unknown,
      args: { phoneNumber: string; password: string },
      context: GraphQLContext
    ) => {
      const user = await context.prisma.user.findUnique({
        where: { phoneNumber: args.phoneNumber },
      });
      if (!user) {
        throw new Error('No such user found');
      }
      const valid = await compare(args.password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }
      const token = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const refreshToken = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '90d',
      });
      const updatedUser = await context.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });
      return {
        token,
        refreshToken,
        user: updatedUser,
      };
    },
    logout: async (parent: unknown, args: {}, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Not authenticated');
      await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: { refreshToken: null },
      });
    },
    sendSMSVerificationCode: async (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) => {
      // Twilio when the phone number is verified
      const foundNumber = await context.prisma.user.findUnique({
        where: { phoneNumber: args.phoneNumber },
      });
      if (foundNumber) throw new Error('Phone number already exists');
      else {
        if (!process.env.TWILIO_VERIFY_SERVICE_SID)
          throw new Error('No Twilio Verify Service SID');
        context.twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: args.phoneNumber,
            channel: 'sms',
          })
          .then((verification) => console.log(verification.status));
      }
    },
    verifySMSCode: async (
      parent: unknown,
      args: { phoneNumber: string; code: string },
      context: GraphQLContext
    ) => {
      if (!process.env.TWILIO_VERIFY_SERVICE_SID)
        throw new Error('No Twilio Verify Service SID');
      // Twilio when the phone number is verified
      context.twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: args.phoneNumber,
          code: args.code,
        })
        .then((verification_check) => console.log(verification_check.status));
    },
    refreshToken: async (
      parent: unknown,
      args: { refreshToken: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Not authenticated');
      if (!context.currentUser.refreshToken)
        throw new Error('No refresh token');
      const valid = compare(
        args.refreshToken,
        context.currentUser.refreshToken
      );
      if (!valid) throw new Error('Invalid refresh token');
      const refreshToken = sign(
        { userId: context.currentUser.id },
        APP_SECRET,
        {
          expiresIn: '90d',
        }
      );
      const token = sign({ userId: context.currentUser.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const user = await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: { refreshToken },
      });
      if (!user) throw new Error('Invalid refresh token');
      return {
        token,
        refreshToken,
        user,
      };
    },
    signUp: async (
      parent: unknown,
      args: { name: string; phoneNumber: string; password: string },
      context: GraphQLContext
    ) => {
      const signUpSchema = z.object({
        name: z.string(),
        phoneNumber: z.string(),
        password: z.string(),
      });
      const userExists = await context.prisma.user.findUnique({
        where: { phoneNumber: args.phoneNumber },
      });
      if (userExists) throw new Error('User already exists');
      const anonUserExists = await context.prisma.anonUser.findUnique({
        where: { phoneNumber: args.phoneNumber },
      });
      if(anonUserExists){
        // change all answers they are answered for to the type of USER, and connect them to the user
      }
      const password = await hash(args.password, 10);
      // convert anonUser to user if exists
      const user = await context.prisma.user.create({
        data: {
          name: args.name,
          phoneNumber: args.phoneNumber,
          password,
        },
      });
      const token = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const refreshToken = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '90d',
      });
      const updatedUser = await context.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });
      return {
        token,
        refreshToken,
        user: updatedUser,
      };
    },
    createAnonUser: async (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) =>
      await context.prisma.anonUser.create({
        data: { phoneNumber: args.phoneNumber },
      }),
    createQuestion: async (
      parent: unknown,
      args: { question: string; type: QuestionType },
      context: GraphQLContext
    ) =>
      await context.prisma.question.create({
        data: { question: args.question, type: args.type },
      }),
    answerQuestion: async (
      parent: unknown,
      args: {
        id: string;
        answer: string;
        type: AnswerType;
      },
      context: GraphQLContext
    ) => {
      if (context.currentUser === null) throw new Error('Not authenticated');
      console.log(args);
      if (args.type === 'TEXT') {
        const textAnswer = await context.prisma.answer.create({
          data: {
            questionId: args.id,
            userId: context.currentUser.id,
            type: args.type,
            textAnswer: args.answer,
          },
        });
        await context.prisma.question.update({
          where: { id: args.id },
          data: { answers: { connect: { id: textAnswer.id } } },
        });
        return textAnswer;
      } else if (args.type === 'USER') {
        const foundUser = await context.prisma.user.findUnique({
          where: { phoneNumber: args.answer },
        });
        if (!foundUser) {
          args.type = 'ANON_USER';
          let anonUserId;
          const foundAnonUser = await context.prisma.anonUser.findUnique({
            where: { phoneNumber: args.answer },
          });
          if (foundAnonUser) anonUserId = foundAnonUser.id;
          else {
            const anonUser = await context.prisma.anonUser.create({
              data: { phoneNumber: args.answer },
            });
            anonUserId = anonUser.id;
          }
          const anonUserAnswer = await context.prisma.answer.create({
            data: {
              questionId: args.id,
              type: args.type,
              userId: context.currentUser.id,
              anonUserAnswerId: anonUserId,
            },
          });
          await context.prisma.question.update({
            where: { id: args.id },
            data: {
              responses: { increment: 1 },
              answers: { connect: { id: anonUserAnswer.id } },
            },
          });
          return anonUserAnswer;
        } else {
          const userAnswer = await context.prisma.answer.create({
            data: {
              questionId: args.id,
              type: args.type,
              userId: context.currentUser.id,
              userAnswerId: foundUser.id,
            },
          });
          await context.prisma.question.update({
            where: { id: args.id },
            data: {
              responses: { increment: 1 },
              answers: { connect: { id: userAnswer.id } },
            },
          });
          return userAnswer;
        }
      } else if (args.type === 'ANON_USER') {
        let anonUserId;
        const foundAnonUser = await context.prisma.anonUser.findUnique({
          where: { phoneNumber: args.answer },
        });
        if (foundAnonUser) anonUserId = foundAnonUser.id;
        else {
          const anonUser = await context.prisma.anonUser.create({
            data: { phoneNumber: args.answer },
          });
          anonUserId = anonUser.id;
        }
        const anonUserAnswer = await context.prisma.answer.create({
          data: {
            questionId: args.id,
            type: args.type,
            userId: context.currentUser.id,
            anonUserAnswerId: anonUserId,
          },
        });
        await context.prisma.question.update({
          where: { id: args.id },
          data: {
            responses: { increment: 1 },
            answers: { connect: { id: anonUserAnswer.id } },
          },
        });
        return anonUserAnswer;
      }
    },
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});
