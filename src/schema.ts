import { createSchema } from 'graphql-yoga';
import type {
  User,
  Answer,
  Question,
  AnonUser,
  QuestionType,
  AnswerType,
  FriendRequest,
} from '@prisma/client';
import { GraphQLContext } from './context';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { APP_SECRET } from './auth';
import { z } from 'zod';
import { GraphQLError } from 'graphql';
import {
  answerQuestionNotification,
  newFriendRequestNotification,
} from './utils/sendNotifications';

const typeDefs = /* GraphQL */ `
  type Query {
    user(id: ID!): User
    users: [User!]!
    userByPhoneNumber(phoneNumber: String!): User
    anonUserByPhoneNumber(phoneNumber: String!): AnonUser
    questionsOfTheDay: [Question!]!
    userAnswerExists: Boolean
    friendFeed: [FriendAnswer!]!
    answersOfTheDay: [Answer!]!
    receivedFriendRequests: [FriendRequest!]!
    sentFriendRequests: [FriendRequest!]!
    usersInContacts(contacts: [String!]!): [User!]!
  }

  type Mutation {
    login(
      phoneNumber: String!
      password: String!
      pushToken: String!
    ): AuthPayload
    logout: Boolean
    signUp(
      name: String!
      phoneNumber: String!
      password: String!
      pushToken: String!
    ): AuthPayload
    refreshToken(refreshToken: String!): AuthPayload
    sendSMSVerificationCode(phoneNumber: String!): Boolean
    verifySMSCode(phoneNumber: String!, code: String!): Boolean
    createQuestionsOfTheDay(questions: [QuestionRequest!]!): Question
    answerQuestion(
      id: ID!
      answer: String!
      type: AnswerType!
      previousAnswerId: ID
    ): Answer
    sendFriendRequest(userId: ID!): Boolean
    cancelFriendRequest(friendRequestId: ID!): Boolean
    acceptFriendRequest(friendRequestId: ID!): Boolean
    rejectFriendRequest(friendRequestId: ID!): Boolean
  }

  type AuthPayload {
    token: String
    refreshToken: String
    user: User
  }

  type FriendAnswer {
    answers: [Answer!]!

    friend: User!
  }

  type QuestionRequest {
    question: String
    type: QuestionType
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
    answers: [[Answer!]!]!
    appearsIn: [[Answer!]!]!
    friends: [User!]!
  }

  type AnonUser {
    id: ID!
    phoneNumber: String!
    appearsIn: [[Answer!]!]!
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
  }

  type Answer {
    id: ID!
    question: Question!
    user: User!
    type: AnswerType!
    createdAt: String!
    updatedAt: String!
    userAnswer: AnswerUser
    textAnswer: String
  }

  type FriendRequest {
    id: ID!
    sender: User!
    createdAt: String!
    updatedAt: String!
    receiver: User!
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
    answers: async (parent: User, args: {}, context: GraphQLContext) => {
      const answers = await context.prisma.answer.findMany({
        where: { userId: parent.id },
      });
      const answerSet = new Set();
      const result = [];
      for (const answer of answers) {
        const list = [];
        if (answerSet.has(answer.id)) continue;
        let currentAnswer: Answer | null = answer;
        while (currentAnswer?.nextAnswerId) {
          list.push(currentAnswer);
          answerSet.add(currentAnswer?.id);
          currentAnswer = await context.prisma.answer.findUnique({
            where: { id: currentAnswer?.nextAnswerId },
          });
        }
        if (list.length > 0) result.push(list);
      }
      return result;
    },
    appearsIn: async (parent: User, args: {}, context: GraphQLContext) => {
      const result = [];
      const answers = await context.prisma.answer.findMany({
        where: { userAnswerId: parent.id },
      });
      for (const answer of answers) {
        const list = [];
        let currentAnswer: Answer | null = answer;
        while (currentAnswer?.nextAnswerId) {
          list.push(currentAnswer);
          currentAnswer = await context.prisma.answer.findUnique({
            where: { id: currentAnswer?.nextAnswerId },
          });
        }
        if (list.length > 0) result.push(list);
      }
      return result;
    },
    friends: async (parent: User, args: {}, context: GraphQLContext) => {
      const friends = await context.prisma.user.findMany({
        where: { friends: { some: { id: parent.id } } },
      });
      return friends;
    },
  },
  AnonUser: {
    id: (parent: AnonUser) => parent.id,
    phoneNumber: (parent: AnonUser) => parent.phoneNumber,
    createdAt: (parent: AnonUser) => parent.createdAt,
    updatedAt: (parent: AnonUser) => parent.updatedAt,
    appearsIn: async (parent: AnonUser, args: {}, context: GraphQLContext) => {
      const result = [];
      const answers = await context.prisma.answer.findMany({
        where: { anonUserAnswerId: parent.id },
      });
      for (const answer of answers) {
        const list = [];
        let currentAnswer: Answer | null = answer;
        while (currentAnswer?.nextAnswerId) {
          list.push(currentAnswer);
          currentAnswer = await context.prisma.answer.findUnique({
            where: { id: currentAnswer?.nextAnswerId },
          });
        }
        if (list.length > 0) result.push(list);
      }
      return result;
    },
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
    userAnswer: async (parent: Answer, args: {}, context: GraphQLContext) => {
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
  FriendRequest: {
    id: (parent: FriendRequest) => parent.id,
    sender: async (parent: FriendRequest, args: {}, context: GraphQLContext) =>
      await context.prisma.user.findUnique({
        where: { id: parent.senderId },
      }),
    createdAt: (parent: FriendRequest) => parent.createdAt,
    updatedAt: (parent: FriendRequest) => parent.updatedAt,
    receiver: async (
      parent: FriendRequest,
      args: {},
      context: GraphQLContext
    ) =>
      await context.prisma.user.findUnique({
        where: { id: parent.receiverId },
      }),
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
    anonUserByPhoneNumber: async (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) =>
      await context.prisma.anonUser.findUnique({
        where: { phoneNumber: args.phoneNumber },
      }),
    questionsOfTheDay: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      let currentQuestions: Question[] | null =
        await context.prisma.question.findMany({
          where: { createdAt: { lt: new Date() }, type: 'USER' },
        });

      let currentQuestion: Question | null | undefined = currentQuestions
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .pop();
      const result = [];
      while (currentQuestion) {
        result.push(currentQuestion);
        if (!currentQuestion.nextQuestionId) break;
        currentQuestion = await context.prisma.question.findUnique({
          where: { id: currentQuestion.nextQuestionId },
        });
      }
      return result;
    },
    userAnswerExists: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const currentQuestions: Question[] | null =
        await context.prisma.question.findMany({
          where: { createdAt: { lt: new Date() }, type: 'USER' },
        });

      const questionOfTheDay: Question | undefined = currentQuestions
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .pop();
      const found = await context.prisma.answer.findFirst({
        where: {
          userId: context.currentUser.id,
          questionId: questionOfTheDay?.id,
        },
      });
      return Boolean(found);
    },
    friendFeed: async (parent: unknown, args: {}, context: GraphQLContext) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const friends = await context.prisma.user.findMany({
        where: { friends: { some: { id: context.currentUser.id } } },
      });
      const questionOfTheDay = await context.prisma.question.findFirst();
      const result = [];
      for (const friend of friends) {
        const friendAnswers = await context.prisma.answer.findMany({
          where: {
            userAnswerId: friend?.id,
            questionId: questionOfTheDay?.id,
          },
        });
        const answers = [];
        for (const answer of friendAnswers) {
          let currentAnswer: Answer | null = answer;
          while (currentAnswer?.nextAnswerId) {
            currentAnswer = await context.prisma.answer.findUnique({
              where: { id: currentAnswer.nextAnswerId },
            });
            if (currentAnswer?.type === 'TEXT') answers.push(currentAnswer);
          }
        }
        result.push({ answers, friend });
      }
      return result;
    },
    answersOfTheDay: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const currentQuestions: Question[] | null =
        await context.prisma.question.findMany({
          where: { createdAt: { lt: new Date() }, type: 'USER' },
        });

      const questionOfTheDay: Question | null | undefined = currentQuestions
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .pop();
      const userAnswers = await context.prisma.answer.findMany({
        where: {
          userAnswerId: context.currentUser.id,
          questionId: questionOfTheDay?.id,
        },
      });
      const result = [];
      for (const answer of userAnswers) {
        let currentAnswer: Answer | null = answer;
        while (currentAnswer?.nextAnswerId) {
          currentAnswer = await context.prisma.answer.findUnique({
            where: { id: currentAnswer.nextAnswerId },
          });
          if (currentAnswer?.type === 'TEXT') result.push(currentAnswer);
        }
      }
      return result;
    },
    usersInContacts: async (
      parent: unknown,
      args: { contacts: string[] },
      context: GraphQLContext
    ) => {
      const users = await context.prisma.user.findMany({
        where: { phoneNumber: { in: args.contacts } },
      });
      return users;
    },
    receivedFriendRequests: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const receivedFriendRequests =
        await context.prisma.friendRequest.findMany({
          where: { receiverId: context.currentUser.id },
        });
      return receivedFriendRequests;
    },
    sentFriendRequests: async (
      parent: unknown,
      args: {},
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const receivedFriendRequests =
        await context.prisma.friendRequest.findMany({
          where: { senderId: context.currentUser.id },
        });
      return receivedFriendRequests;
    },
  },
  Mutation: {
    login: async (
      parent: unknown,
      args: { phoneNumber: string; password: string; pushToken: string },
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
        data: { refreshToken, expoPushToken: args.pushToken },
      });
      return {
        token,
        refreshToken,
        user: updatedUser,
      };
    },
    logout: async (parent: unknown, args: {}, context: GraphQLContext) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
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
      const decodedToken = verify(args.refreshToken, APP_SECRET) as {
        userId: string;
      };
      const refreshTokenUser = await context.prisma.user.findUnique({
        where: { id: decodedToken.userId },
      });

      if (!refreshTokenUser) throw new Error('Invalid refresh token');
      if (!refreshTokenUser.refreshToken) throw new Error('No refresh token');

      const valid = compare(args.refreshToken, refreshTokenUser.refreshToken);
      if (!valid) throw new Error('Invalid refresh token');
      const refreshToken = sign({ userId: refreshTokenUser.id }, APP_SECRET, {
        expiresIn: '90d',
      });
      const token = sign({ userId: refreshTokenUser.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const user = await context.prisma.user.update({
        where: { id: refreshTokenUser.id },
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
      args: {
        name: string;
        phoneNumber: string;
        password: string;
        pushToken: string;
      },
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
        include: { appearsIn: true },
      });

      const password = await hash(args.password, 10);

      const user = await context.prisma.user.create({
        data: {
          name: args.name,
          phoneNumber: args.phoneNumber,
          password,
          expoPushToken: args.pushToken,
        },
      });
      const token = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '1d',
      });
      const refreshToken = sign({ userId: user.id }, APP_SECRET, {
        expiresIn: '90d',
      });
      // convert anonUser to user if exists
      if (anonUserExists) {
        // change all answers they are answered for to the type of USER, and connect them to the user
        // go through all appears in and change the type to USER and change useranswerid to new user id
        // first test if I dont connect the answer to the user and just change the type and useranswerid will it still show up under the new user
        // then i wonder if i can feed the appearsin to the user creation call and have it connect the answers
        const updateAnswerPromises = await Promise.all(
          anonUserExists.appearsIn.map(
            async (answer) =>
              await context.prisma.answer.update({
                where: { id: answer.id },
                data: {
                  // Update fields of the answer if needed
                  type: 'USER', //
                  userAnswerId: user.id, // Set the user id to the new user id
                  anonUserAnswerId: null, // Set the anonUserAnswerId to null
                },
              })
          )
        );

        const answerIds = updateAnswerPromises.map((answer) => ({
          id: answer.id,
        }));

        const updatedUser = await context.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken,
            appearsIn: { connect: answerIds },
          },
        });

        await context.prisma.anonUser.delete({
          where: { id: anonUserExists.id },
        });

        return {
          token,
          refreshToken,
          user: updatedUser,
        };
      }
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
    createQuestionsOfTheDay: async (
      parent: unknown,
      args: {
        questions: Array<{
          question: string;
          type: QuestionType;
        }>;
      },
      context: GraphQLContext
    ) => {
      let previousQuestionId = null;
      for (const question of args.questions) {
        const questionResult = await context.prisma.question.create({
          data: {
            question: question.question,
            type: question.type,
          },
        });
        if (previousQuestionId) {
          await context.prisma.question.update({
            where: { id: previousQuestionId },
            data: { nextQuestionId: questionResult.id },
          });
        }
        previousQuestionId = questionResult.id;
      }
      
    },
    answerQuestion: async (
      parent: unknown,
      args: {
        id: string;
        answer: string;
        type: AnswerType;
        previousAnswerId?: string;
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
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
        if (args.previousAnswerId) {
          await context.prisma.answer.update({
            where: { id: args.previousAnswerId },
            data: { nextAnswerId: textAnswer.id },
          });
        }
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
          if (args.previousAnswerId) {
            await context.prisma.answer.update({
              where: { id: args.previousAnswerId },
              data: { nextAnswerId: anonUserAnswer.id },
            });
          }
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
          if (args.previousAnswerId) {
            await context.prisma.answer.update({
              where: { id: args.previousAnswerId },
              data: { nextAnswerId: userAnswer.id },
            });
          }
          await answerQuestionNotification({
            expo: context.expo,
            userAnswerId: foundUser.id,
            userExpoPushToken: foundUser.expoPushToken,
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
        await context.prisma.answer.update({
          where: { id: args.previousAnswerId },
          data: { nextAnswerId: anonUserAnswer.id },
        });
        return anonUserAnswer;
      }
    },
    sendFriendRequest: async (
      parent: unknown,
      args: { userId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: {
          sentFriendRequests: {
            create: { receiverId: args.userId },
          },
        },
      });
      const recievedUser = await context.prisma.user.findUnique({
        where: { id: args.userId },
      });
      await newFriendRequestNotification({
        expo: context.expo,
        userExpoPushToken: recievedUser?.expoPushToken,
      });
      return true;
      // send notification to the user that they have a friend request
    },
    cancelFriendRequest: async (
      parent: unknown,
      args: { friendRequestId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: { sentFriendRequests: { delete: { id: args.friendRequestId } } },
      });
      return true;
    },
    acceptFriendRequest: async (
      parent: unknown,
      args: { friendRequestId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      const friendRequest = await context.prisma.friendRequest.delete({
        where: { id: args.friendRequestId },
      });
      await context.prisma.user.update({
        where: { id: context.currentUser.id },
        data: {
          friends: { connect: { id: friendRequest?.senderId } },
          friendsOf: { connect: { id: friendRequest?.senderId } },
        },
      });
      return true;
      // send notification to the sender that their friend request was accepted
    },
    rejectFriendRequest: async (
      parent: unknown,
      args: { friendRequestId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser)
        throw new GraphQLError('NOT AUTHENTICATED', {
          extensions: {
            code: 'FORBIDDEN',
          },
        });
      await context.prisma.friendRequest.delete({
        where: { id: args.friendRequestId },
      });
      return true;
    },
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});
