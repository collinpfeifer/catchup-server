import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { createContext } from './context';
import { schema } from './schema';
// import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { readFileSync } from 'node:fs';

function main() {
  // const persistedOperations = JSON.parse(
  //   readFileSync('src/persistedOperations.json', 'utf-8')
  // );

  const yoga = createYoga({
    schema,
    context: createContext,
    logging: 'debug',
    healthCheckEndpoint: '/health',
    // plugins: [
    //   usePersistedOperations({
    //     getPersistedOperation(sha256Hash: string) {
    //       return persistedOperations[sha256Hash];
    //     },
    //   }),
    // ],
  });
  const server = createServer(yoga);
  server.listen(process.env.PORT, () => {
    console.info(`Server is running on port ${process.env.PORT}`);
  });
}

main();
