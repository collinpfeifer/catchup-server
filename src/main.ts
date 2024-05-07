import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { createContext } from './context';
import { schema } from './schema';

function main() {
  const yoga = createYoga({
    schema,
    context: createContext,
    logging: 'debug',
    healthCheckEndpoint: '/health',
  });
  const server = createServer(yoga);
  server.listen(process.env.PORT, () => {
    console.info(
      `Server is running on port ${process.env.PORT}`
    );
  });
}

main();
