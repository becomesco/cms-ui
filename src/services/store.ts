/* eslint-disable @typescript-eslint/no-explicit-any */
import { writable } from 'svelte/store';
import * as uuid from 'uuid';
import type { Writable } from 'svelte/store';
import { sdk } from './sdk';
import { SocketEventData, SocketEventName } from '@becomes/cms-sdk';
import type { Entry, EntryLite } from '@becomes/cms-sdk';
import { Router } from '@becomes/svelte-router';
import { GeneralService } from './general';

type SocketEventDataUpdate = {
  name: 'entry' | 'group' | 'template' | 'widget';
  ids: string[];
};
type SocketEvent = {
  data: SocketEventData;
  updates?: SocketEventDataUpdate[];
};

export type StoreServicePrototype = {
  create(name: string, value: any): void;
  update(name: string, value: any): void;
  set<T extends { _id: string }>(name: string, value: T | T[]): void;
  subscribe(name: string, handler: (value: any) => Promise<void>): () => void;
  runUpdates(updates: SocketEventDataUpdate[]): Promise<void>;
};

function storeService(store: {
  [key: string]: {
    w: Writable<any>;
    unsub: () => void;
    subs: Array<{
      id: string;
      handler: (value: any) => Promise<void>;
    }>;
  };
}) {
  const self: StoreServicePrototype = {
    create(name, value) {
      if (!store[name]) {
        store[name] = {
          w: writable(value),
          unsub: () => {
            // temp handler
          },
          subs: [],
        };
        store[name].unsub = store[name].w.subscribe(async (value) => {
          store[name].subs.forEach(async (e) => {
            await e.handler(value);
          });
        });
      }
    },
    update(name, value) {
      if (!store[name]) {
        throw Error(`Store with name "${name}" does not exist.`);
      }
      if (typeof value === 'function') {
        store[name].w.update((e) => {
          return value(e);
        });
      } else {
        store[name].w.update(() => value);
      }
    },
    set<T extends { _id: string }>(name: string, value: T | T[]) {
      self.update(name, (store: T[]) => {
        if (value) {
          if (value instanceof Array) {
            for (let i = 0; i < value.length; i++) {
              let found = false;
              for (let j = 0; j < store.length; j++) {
                if (store[j]._id === value[i]._id) {
                  found = true;
                  store[j] = value[i];
                  break;
                }
              }
              if (!found) {
                store.push(value[i]);
              }
            }
          } else {
            let found = false;
            for (let i = 0; i < store.length; i++) {
              if (store[i]._id === value._id) {
                store[i] = JSON.parse(JSON.stringify(value));
                found = true;
                break;
              }
            }
            if (!found) {
              store.push(JSON.parse(JSON.stringify(value)));
            }
          }
        }
        return store;
      });
    },
    subscribe(name, handler) {
      if (!store[name]) {
        throw Error(`Store with name "${name}" does not exist.`);
      }
      const id = uuid.v4();
      store[name].subs.push({
        id,
        handler,
      });
      return () => {
        if (store[name]) {
          store[name].subs = store[name].subs.filter((e) => e.id !== id);
        }
      };
    },
    async runUpdates(updates) {
      if (updates) {
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          if (update.ids.length > 0) {
            if (update.name !== 'entry') {
              StoreService.update(update.name, await sdk[update.name].getAll());
            } else {
              const pathParts = Router.path().split('/').slice(1);
              if (
                pathParts.length === 5 &&
                pathParts[1] === 'template' &&
                pathParts[3] === 'entry' &&
                pathParts[4] !== '-' &&
                update.ids.includes(pathParts[4])
              ) {
                const entry = await sdk.entry.get({
                  templateId: pathParts[2],
                  id: pathParts[4],
                });
                StoreService.update('entry', (values: Entry[]) => {
                  values = values.filter((e) => e._id !== entry._id);
                  values.push(entry);
                  return values;
                });
              }
            }
          }
        }
      }
    },
  };
  return self;
}

export const StoreService = storeService({});
StoreService.create('template', []);
StoreService.create('group', []);
StoreService.create('widget', []);
StoreService.create('language', []);
StoreService.create('user', []);
StoreService.create('apiKey', []);
StoreService.create('media', []);
StoreService.create('entry', []);
StoreService.create('status', []);

sdk.socket.subscribe(SocketEventName.TEMPLATE, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('template', await sdk.template.getAll());
    await StoreService.runUpdates(event.updates);
  }
});
sdk.socket.subscribe(SocketEventName.GROUP, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('group', await sdk.group.getAll());
    await StoreService.runUpdates(event.updates);
  }
});
sdk.socket.subscribe(SocketEventName.WIDGET, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('widget', await sdk.widget.getAll());
  }
});
sdk.socket.subscribe(SocketEventName.LANGUAGE, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('language', await sdk.language.getAll());
  }
});
sdk.socket.subscribe(SocketEventName.USER, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('user', await sdk.user.getAll());
  }
});
sdk.socket.subscribe(SocketEventName.API_KEY, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('apiKey', await sdk.apiKey.getAll());
  }
});
sdk.socket.subscribe(SocketEventName.MEDIA, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('media', await sdk.media.getAll());
  }
});
sdk.socket.subscribe(SocketEventName.ENTRY, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    console.log('HERE');
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.entry.get({
          id: event.data.entry._id,
          templateId: event.data.entry.additional.templateId,
        });
      },
      async (value) => {
        StoreService.update('entry', (store: Array<Entry | EntryLite>) => {
          const target = store.find((e) => e._id === value._id);
          if (target) {
            for (let i = 0; i < store.length; i++) {
              if (store[i]._id === value._id) {
                store[i] = value;
                break;
              }
            }
          } else {
            store.push(value);
          }
          return store;
        });
      }
    );
    // StoreService.update(
    //   'entry',
    //   await sdk.entry.getAllLite(event.data.entry.additional.templateId)
    // );
  }
});
sdk.socket.subscribe(SocketEventName.STATUS, async (event: SocketEvent) => {
  if (event.data.source !== sdk.socket.id()) {
    StoreService.update('status', await sdk.status.getAll());
  }
});
