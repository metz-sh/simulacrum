import { Meta, StoryObj } from '@storybook/react';

import { MantineProvider } from '@mantine/core';
import { Editor } from '../index';
import { memo, useCallback, useEffect, useState } from 'react';
import { bundle, sampleArtifacts } from './sample-artifacts';

const meta: Meta<typeof Editor> = {
	title: 'components/index',
	tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Editor>;
const files = [
	{
		path: 'app/rds',
		type: 'folder' as const,
	},
	{
		path: 'app/rds/users.ts',
		type: 'file' as const,
		value: `

    /**
 * Auto generated code for a keyvalue store.
 *
 * You can update this comment block and it will reflect
 * it as description on the playground!
*/
@KeyValue
class Redis<T> {

    @Show
    data: Map<string, T> = new Map();

    set(key: string, value: T) {
        this.data.set(key, value);

        return 6969;
    }

    get(key: string) {
        return this.data.get(key);
    }

    delete(key: string) {
        this.data.delete(key);
    }

}


type User = {
  id: string,
  name: string,
  createdAt: number,
}

/**
 * Auto generated code for a relational db table.
 *
 * You can update this comment block and it will reflect
 * it as description on the playground!
*/
@Injectable
@Table(['id', 'value', 'createdAt'])
class Users {

  @Show
  data: User[] = [{ id: '1337', name: 'Lisa', createdAt: 1 }];

  insert(recordToInsert: Omit<User, 'createdAt'>) {
      const record: User = {
          ...recordToInsert,
          createdAt: std.currentTick(),
      };

      this.data.push(record);
      return record;
  }

  find(predicate: (record: User) => boolean) {
      return this.data.find(predicate);
  }

  findAll(predicate: (record: User) => boolean) {
      return this.data.filter(predicate);
  }

  update(
      partialUpdate: Partial<User>,
      predicate: (record: User) => boolean,
  ) {
      const indexOfRecord = this.data.findIndex(predicate);
      if(indexOfRecord < 0) {
          return;
      }
      const existingRecord = this.data[indexOfRecord];
      const updatedRecord = {
          ...existingRecord,
          ...partialUpdate,
      };

      this.data[indexOfRecord] = updatedRecord;

      return updatedRecord;
  }

  delete(predicate: (record: User) => boolean) {
      const index = this.data.findIndex(predicate);
      if(index < 0) {
          return;
      }
      this.data.splice(index, 1);
  }
}
    `,
	},
	{
		path: 'app/server/backend.ts',
		type: 'file' as const,
		value: `

    /**
     * Auto generated code for a service.
     *
     * You can update this comment block and it will reflect
     * it as description on the playground!
    */
    @Injectable
    class BackendService {

      private healthy = false;
      private redis = new Redis<User>();
      private redis1 = new Redis<User>();
      dbFailureProbability = 10;
      private userTable = std.resolve(Users);
      isOK = true;
      private updateCacheFlow1 = std.flow('Update cache 1', this.redis);

      constructor(readonly mess = false) {
      }

      /**
       * Checks if all systems are good.
      */
      healthCheck() {
          std.log('aaa', this.mess);
          const j = () => this.isDbReachable();
          if(j() === this.isOK) {
              this.healthy = true;
              return 200;
          }

          this.healthy = false;
          return 500
      }

      /**
       * Checks if DB connection is good.
      */
      isDbReachable() {
          const isFailure = this.failRandomly(this.dbFailureProbability);
          return !isFailure;
      }

      /**
       * Fetch a user by id
      */
      getUserById(id: string) {
        //   const cachedUser = this.redis.get(id);
        // if(cachedUser) {
        //     return cachedUser;
        // }

        const userFromDB = this.userTable.find(std.lambda(record => record.id === id));
        if(!userFromDB) {
            return
        }

        const r = this.updateCache(id, userFromDB);
        // this.redis.set(id, userFromDB);

        return r;
      }

      updateCache(id: string, user: User) {
        const f1 = this.updateCacheFlow1.set(id, user);
        const r = std.awaitRace(
          [
            std.flow<BackendService>('Set first', this).anotherSet(f1),
            std.flow<BackendService>('Set second', this).anotherSet1(f1),
          ]
        );

        return r;
      }

      anotherSet<T, M>(flow: std.FlowExecutor<number, Redis<User>['set']>) {
        return flow.await();
      }

      anotherSet1<T, M>(flow: std.FlowExecutor<number, Redis<User>['set']>) {
        std.sleep(2);
        return flow.await();
      }

      /**
       * This won't show up in playground since it's private.
       *
       * It takes a failure probability in percentage and returns
       * a boolean indicating if it indeed failed or not.
      */
      private failRandomly(failProbablityPercentage: number): boolean {
          const parsedProbability = failProbablityPercentage/100;
          const rand = Math.random();

          if(rand <= parsedProbability) {
              return true;
          }

          return false;
      }

    }

    `,
	},
];

const CodeDaemon = memo((props: {}) => {
	return (
		<MantineProvider withGlobalStyles withNormalizeCSS>
			<Editor
				enableModalProvider
				onMount={({ stateChangeObservable: obs, analyticsObservable: aobs }) => {
					obs.subscribe(console.log);
					// aobs.subscribe(console.log);
				}}
				projectName="test"
				project={files}
				height="100vh"
				build={{
					state: 'uninitiated',
				}}
				storySetups={[
					{
						title: 'Fetch user',
						id: '0',
						script: {
							raw: `const backend = std.resolve(BackendService);
              std.flow('Get user from DB', backend).getUserById('1337').run();`,
							compiled: `const backend = std.resolve(BackendService);
              std.flow('Get user from DB', backend).getUserById('1337').run();`,
						},
					},
					{
						title: 'Perform health check',
						id: '1',
						script: {
							raw: `
const backend = std.resolve(BackendService);
std.flow(
    'Perform healthcheck',
    backend,
    {
        every: 5,
    }
).healthCheck();
`,
							compiled: `
const backend = std.resolve(BackendService);
std.flow(
    'Perform healthcheck',
    backend,
    {
        every: 5,
    }
).healthCheck();
`,
						},
					},
				]}
			/>
		</MantineProvider>
	);
});

export const withIDE: Story = {
	render: () => {
		return <CodeDaemon />;
	},
};
