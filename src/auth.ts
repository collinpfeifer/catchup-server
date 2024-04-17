import { JwtPayload, verify } from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';

export const APP_SECRET = 'this is my secret';

export async function authenticateUser(
  prisma: PrismaClient,
  request: Request
): Promise<User | null> {
  const header = request.headers.get('Authorization');
  // somehow figure out how to verify the token is still valid just expired if needed to do a refresh
  if (header !== null) {
    // 1
    const token = header.split(' ')[1];
    // 2
    try {
      const tokenPayload = verify(token, APP_SECRET) as JwtPayload;
      const userId = tokenPayload.userId;
      // 4
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (e: any) {
      return null;
    }
    // 3
  }

  return null;
}
