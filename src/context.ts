import { YogaInitialContext } from 'graphql-yoga';
import { PrismaClient, User } from '@prisma/client';
import { authenticateUser } from './auth';
import twilio from 'twilio';
import TwilioSDK from 'twilio';

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_ACCOUNT_AUTH_TOKEN
);

export type GraphQLContext = {
  prisma: PrismaClient;
  currentUser: null | User;
  twilioClient: TwilioSDK.Twilio;
};

export async function createContext(
  initialContext: YogaInitialContext
): Promise<GraphQLContext> {
  return {
    twilioClient,
    prisma,
    currentUser: await authenticateUser(prisma, initialContext.request),
  };
}
