import { PrismaClient, User } from '@prisma/client';

export default async function questionOrder(prisma: PrismaClient) {
  const users = await prisma.user.findMany();
  const answeredMap = new Map<string, number>();
  for (const user of users) {
    answeredMap.set(user.id, 0);
  }
  const questionOrder: string[] = [];
  let curUser = users[Math.floor(Math.random() * users.length)];
  console.log(curUser);
  let curUserFriends = await prisma.user
    .findUnique({
      where: { id: curUser.id },
    })
    .friends();
  console.log(curUserFriends);
  console.log(answeredMap);
  // find a friend of randomUser that has the largest number of different friends from randomUser
  questionOrder.push(curUser.id);
  let allAtLeastThanOne = [...answeredMap.values()].every(
    (value) => value >= 1
  );
  while (!allAtLeastThanOne) {
    let maxDiff = 0;
    let minAnswered = Infinity;
    let friend = null;
    if (curUserFriends === null || curUserFriends.length === 0) return null;
    for (const user of curUserFriends) {
      console.log(user.id);
      if (user.id === curUser.id) continue;
      const userFriends = await prisma.user
        .findUnique({ where: { id: user.id } })
        .friends();
      if (userFriends === null || userFriends.length === 0) continue;
      const diff = userFriends.filter(
        (friend) => curUserFriends !== null && !curUserFriends.includes(friend)
      ).length;
      console.log(diff);
      const answeredCount = answeredMap.get(user.id);
      if (answeredCount === undefined) return null;
      console.log(answeredCount);
      if (
        answeredCount <= minAnswered
      ) {
        maxDiff = diff;
        friend = user;
      }
    }
    if (friend === null) return null;
    questionOrder.push(friend.id);
    const count = answeredMap.get(friend.id) || 0;
    console.log(friend.id, count);
    answeredMap.set(friend.id, count + 1);
    console.log(answeredMap);
    curUser = friend;
    curUserFriends = await prisma.user
      .findUnique({
        where: { id: curUser.id },
      })
      .friends();
    allAtLeastThanOne = [...answeredMap.values()].every((value) => value >= 1);
  }
  return questionOrder;
}
