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
    questions: [Question!]!
    answer(id: ID!): Answer
    answers: [Answer!]!
  }

  type Mutation {
    login(phoneNumber: String!, password: String!): AuthPayload
    logout: Boolean
    signUp(name: String!, phoneNumber: String!, password: String!): AuthPayload
    refreshToken(refreshToken: String!): AuthPayload
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
      switch (parent.type) {
        case 'USER':
          if (parent.userAnswerId === null) return null;
          return await context.prisma.user.findUnique({
            where: { id: parent.userAnswerId },
          });
        case 'ANON_USER':
          if (parent.anonUserAnswerId === null) return null;
          return await context.prisma.anonUser.findUnique({
            where: { id: parent.anonUserAnswerId },
          });
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
    questions: async (parent: unknown, args: {}, context: GraphQLContext) =>
      await context.prisma.question.findMany(),
    answer: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => await context.prisma.answer.findUnique({ where: { id: args.id } }),
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
      const token = sign({ userId: user.id }, APP_SECRET);
      return {
        token,
        user,
      };
    },
    logout: async (parent: unknown, args: {}, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Not authenticated');
      await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: { refreshToken: null },
      });
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
      const refrshToken = sign({ userId: context.currentUser.id }, APP_SECRET, {
        expiresIn: '90d',
      });
      const token = sign({ userId: context.currentUser.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const user = await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: { refreshToken: token },
      });
      if (!user) throw new Error('Invalid refresh token');
      return {
        token,
        refrshToken,
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
      const password = await hash(args.password, 10);
      const anonUser = await context.prisma.anonUser.findUnique({
        where: { phoneNumber: args.phoneNumber },
      });
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
      return {
        token,
        refreshToken,
        user,
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
      switch (args.type) {
        case 'TEXT':
          return await context.prisma.answer.create({
            data: {
              questionId: args.id,
              userId: context.currentUser.id,
              type: args.type,
              textAnswer: args.answer,
            },
          });
        case 'USER':
          return await context.prisma.answer.create({
            data: {
              questionId: args.id,
              type: args.type,
              userId: context.currentUser.id,
              userAnswerId: args.answer,
            },
          });
        case 'ANON_USER':
          return await context.prisma.answer.create({
            data: {
              questionId: args.id,
              type: args.type,
              userId: context.currentUser.id,
              anonUserAnswerId: args.answer,
            },
          });
      }
    },
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});
