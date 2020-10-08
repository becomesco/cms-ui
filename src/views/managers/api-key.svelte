<script lang="ts">
  import { onMount, onDestroy, beforeUpdate } from 'svelte';
  import type {
    APIFunction,
    ApiKey,
    Template,
    UserPolicyCRUD,
  } from '@becomes/cms-sdk';
  import {
    Layout,
    ManagerLayout,
    EntityInfo,
    NoEntities,
    Button,
    CRUDPolicy,
    CheckboxInput,
    NameDescModal,
    FNPolicy,
  } from '../../components';
  import { GeneralService, sdk, StoreService, popup } from '../../services';
  import Secret from '../../components/secret.svelte';

  export let id: string = undefined;

  type ApiFuntionModified = {
    selected: boolean;
  } & APIFunction;

  const keyStoreUnsub = StoreService.subscribe(
    'apiKey',
    async (value: ApiKey[]) => {
      if (value) {
        keys = value;
        key = keys.find((e) => e._id === id);
      }
    }
  );
  const templateStoreUnsub = StoreService.subscribe(
    'template',
    async (value) => {
      if (value) {
        templates = value;
      }
    }
  );
  const pathUnsub = StoreService.subscribe('path', async (value) => {
    const link = value as string;
    if (link.startsWith('/dashboard/key/editor')) {
      const tempId = link.split('/')[link.split('/').length - 1];
      if (tempId === '-') {
        key = keys[0];
      } else {
        id = tempId;
        key = keys.find((e) => e._id === id);
        if (!key) {
          key = keys[0];
        }
      }
    }
  });
  const buffer = {
    id: '',
  };
  let apiFunctions: ApiFuntionModified[] = [];
  let templates: Template[] = [];
  let keys: ApiKey[] = [];
  let key: ApiKey;
  let editKeyData = {
    name: '',
    desc: '',
  };

  async function create(name: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.apiKey.add({
          name,
          desc,
          blocked: false,
          access: {
            templates: [],
            functions: [],
          },
        });
      },
      async (value: ApiKey) => {
        StoreService.update('apiKey', (kys: ApiKey[]) => {
          kys.push(value);
          return kys;
        });
        const pathParts = window.location.pathname.split('/');
        GeneralService.navigate(
          [...pathParts.splice(0, pathParts.length - 1), value._id].join('/')
        );
        popup.success('Key successfully created.');
      }
    );
  }
  async function update(name: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.apiKey.update({
          _id: key._id,
          name,
          desc,
        });
      },
      async (value: ApiKey) => {
        StoreService.update('apiKey', (kys: ApiKey[]) => {
          for (const i in kys) {
            if (kys[i]._id === value._id) {
              kys[i] = value;
              break;
            }
          }
          return kys;
        });
        popup.success('Key successfully updated.');
      }
    );
  }
  async function updatePolicy() {
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.apiKey.update({
          _id: key._id,
          access: key.access,
        });
      },
      async (value: ApiKey) => {
        StoreService.update('apiKey', (kys: ApiKey[]) => {
          for (const i in kys) {
            if (kys[i]._id === value._id) {
              kys[i] = value;
              break;
            }
          }
          return kys;
        });
        popup.success('Key policy successfully updated.');
      }
    );
  }
  async function blockUnblockAccess(blocked: boolean) {
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.apiKey.update({
          _id: key._id,
          blocked,
        });
      },
      async (value: ApiKey) => {
        StoreService.update('apiKey', (kys: ApiKey[]) => {
          for (const i in kys) {
            if (kys[i]._id === value._id) {
              kys[i] = value;
              break;
            }
          }
          return kys;
        });
        popup.success('Key successfully updated.');
      }
    );
  }
  async function remove() {}
  function setKeyTemplatePolicy(data: UserPolicyCRUD & { _id: string }) {
    for (const i in key.access.templates) {
      const policy = key.access.templates[i];
      if (policy._id === data._id) {
        key.access.templates[i] = data;
        return;
      }
    }
    key.access.templates = [...key.access.templates, data];
  }
  function setKeyFunctionPolicy(data: {
    fn: ApiFuntionModified;
    value: boolean;
  }) {
    if (data.value) {
      key.access.functions = [...key.access.functions, { name: data.fn._id }];
    } else {
      key.access.functions = key.access.functions.filter(
        (e) => e.name !== data.fn._id
      );
    }
  }

  beforeUpdate(async () => {
    if (buffer.id !== id) {
      buffer.id = id;
      apiFunctions.forEach((fn) => {
        if (!fn.public) {
          if (key.access.functions.find((e) => e.name === fn._id)) {
            fn.selected = true;
          } else {
            fn.selected = false;
          }
        }
      });
    }
  });

  onMount(async () => {
    apiFunctions = (await sdk.apiFunction.getAll()).map((e) => {
      return {
        _id: e._id,
        public: e.public,
        selected: e.public ? true : false,
      };
    });
    StoreService.update('apiKey', await sdk.apiKey.getAll());
    StoreService.update('template', await sdk.template.getAll());
    if (!id || id === '-') {
      key = keys[0];
      GeneralService.navigate(`/dashboard/key/editor/${keys[0]._id}`);
    }
  });
  onDestroy(() => {
    templateStoreUnsub();
    keyStoreUnsub();
    pathUnsub();
  });
</script>

<Layout>
  <ManagerLayout
    label="KEYS"
    actionText="Add new Key"
    on:action={() => {
      StoreService.update('NameDescModal', true);
    }}
    items={keys.map((e, i) => {
      return { name: e.name, link: `/dashboard/key/editor/${e._id}`, selected: key && key._id === e._id };
    })}>
    <div class="km">
      {#if keys.length === 0}
        <NoEntities
          name="Keys"
          on:action={() => {
            StoreService.update('NameDescModal', true);
          }} />
      {:else if key}
        <EntityInfo
          id={key._id}
          createdAt={key.createdAt}
          updatedAt={key.updatedAt}
          name={key.name}
          description={key.desc}
          on:edit={() => {
            editKeyData.name = '' + key.name;
            editKeyData.desc = '' + key.desc;
            StoreService.update('NameDescModal', true);
          }}
          on:delete={() => {
            remove();
          }} />
        <Secret class="mt--20" label="Key secret" secret={key.secret} />
        <div class="km--blocked">
          <CheckboxInput
            label="Blocked"
            helperText="If checked, key will not be able to access any resources."
            value={key.blocked}
            on:input={(event) => {
              blockUnblockAccess(event.detail);
            }} />
        </div>
        <div class="km--policy">
          <h3>Template policy</h3>
          <div class="grid">
            {#each templates as template}
              <CRUDPolicy
                title={template.label}
                initialValue={key.access.templates.find((e) => e._id === template._id)}
                on:change={(event) => {
                  setKeyTemplatePolicy({ _id: template._id, ...event.detail });
                }} />
            {/each}
          </div>
          <h3 class="mt--50">Function policy</h3>
          <div class="grid">
            {#each apiFunctions as fn}
              <FNPolicy
                title={fn._id}
                checked={!!key.access.functions.find((e) => e.name === fn._id)}
                initialValue={fn}
                on:change={(event) => {
                  setKeyFunctionPolicy({ fn, value: event.detail });
                }} />
            {/each}
          </div>
          <div class="update">
            <Button
              icon="fas fa-marker"
              on:click={() => {
                updatePolicy();
              }}>
              Update
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </ManagerLayout>
  <NameDescModal
    name={editKeyData.name}
    desc={editKeyData.desc}
    on:cancel={() => {
      editKeyData.name = '';
      editKeyData.desc = '';
    }}
    on:done={(event) => {
      if (editKeyData.name !== '') {
        editKeyData.name = '';
        editKeyData.desc = '';
        update(event.detail.name, event.detail.desc);
      } else {
        create(event.detail.name, event.detail.desc);
      }
    }} />
</Layout>
