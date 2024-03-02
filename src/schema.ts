import { createSchema } from 'graphql-yoga';
import type { User, Answer, Question, AnonUser } from '@prisma/client';
import { GraphQLContext } from './context';

const typeDefs = /* GraphQL */ `
  type Query {
    user(id: ID!): User
    users: [User!]!
    userByPhoneNumber(phoneNumber: String!): User
    anonUser(id: ID!): AnonUser
    anonUsers: [AnonUser!]!
    anonUserByPhoneNumber(phoneNumber: String!): AnonUser
    anonUserToUser(id: ID!): User
    question(id: ID!): Question
    answerQuestion(id: ID!, answers: [Answer!]!): Answer 
    questions: [Question!]!
    answer(id: ID!): Answer
    answers: [Answer!]!
  }

  type Mutation {
    login(phoneNumber: String!, password: String!): User
    logout: Boolean
    signUp(name: String!, phoneNumber: String!, password: String!): User
    createAnonUser(phoneNumber: String!): AnonUser
    createQuestion(question: String!): Question
    createAnswer(question: ID!, answer: [User!]!): Answer
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

  union User = User | AnonUser
      
  /* idk about question instead of text i cant decide*/
  /*  for Question.question*/

  type Question {
    id: ID!
    question: String!
    createdAt: String!
    updatedAt: String!
    answers: [Answer!]!
  }

  type Answer {
    id: ID!
    question: Question!
    user: User!
    createdAt: String!
    updatedAt: String!
    answer: [User!]!
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
  },
  Question: {
    id: (parent: Question) => parent.id,
    question: (parent: Question) => parent.question,
    createdAt: (parent: Question) => parent.createdAt,
    updatedAt: (parent: Question) => parent.updatedAt,
  },
  Answer: {
    id: (parent: Answer) => parent.id,
    question: (parent: Answer) => parent.question,
    user: (parent: Answer) => parent.user,
    createdAt: (parent: Answer) => parent.createdAt,
    updatedAt: (parent: Answer) => parent.updatedAt,
    answer: (parent: Answer) => parent.answer,
  },
  AnonUser: {
    id: (parent: AnonUser) => parent.id,
    phoneNumber: (parent: AnonUser) => parent.phoneNumber,
    createdAt: (parent: AnonUser) => parent.createdAt,
    updatedAt: (parent: AnonUser) => parent.updatedAt,
  },

  Query: {
    user: (parent: unknown, args: { id: string }, context: GraphQLContext) =>
      context.prisma.user({ id }),
    users: (parent: unknown, args: {}, context: GraphQLContext) =>
      context.prisma.users(),
    userByPhoneNumber: (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) => context.prisma.userByPhoneNumber({ phoneNumber }),
    anonUser: (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => context.prisma.anonUser({ id }),
    anonUsers: (parent: unknown, args: {}, context: GraphQLContext) =>
      context.prisma.anonUsers(),
    anonUserByPhoneNumber: (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) => context.prisma.anonUserByPhoneNumber({ phoneNumber }),
    question: (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => context.prisma.question({ id }),
    answerQuestion: (
      parent: unknown,
      args: { id: string; answers: Array<Answer> },
      context: GraphQLContext
    ) => context.prisma.answerQuestion({ id, answers }),
    questions: (parent: unknown, args: {}, context: GraphQLContext) =>
      context.prisma.questions(),
    answer: (parent: unknown, args: { id: string }, context: GraphQLContext) =>
      context.prisma.answer({ id }),
    answers: (parent: unknown, args: {}, context: GraphQLContext) =>
      context.prisma.answers(),
  },
  Mutation: {
    login: (
      parent: unknown,
      args: { phoneNumber: string; password: string },
      context: GraphQLContext
    ) => context.prisma.login({ phoneNumber, password }),
    logout: (parent: unknown, args: {}, context: GraphQLContext) =>
      context.prisma.logout(),
    signUp: (
      parent: unknown,
      args: { name: string; phoneNumber: string; password: string },
      context: GraphQLContext
    ) => context.prisma.signUp({ name, phoneNumber, password }),
    createAnonUser: (
      parent: unknown,
      args: { phoneNumber: string },
      context: GraphQLContext
    ) => context.prisma.createAnonUser({ phoneNumber }),
    anonUserToUser: (parent: unknown, args: { id }, context: GraphQLContext) =>
      context.prisma.anonUserToUser({ id }),
    createQuestion: (
      parent: unknown,
      args: { question: string },
      context: GraphQLContext
    ) => context.prisma.createQuestion({ question }),
    createAnswer: (
      parent: unknown,
      args: { question: string; answer: string },
      context: GraphQLContext
    ) => context.prisma.createAnswer({ question, answer }),
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});
