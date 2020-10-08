<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Group, Prop } from '@becomes/cms-sdk';
  import {
    Layout,
    ManagerLayout,
    EntityInfo,
    PropListTable,
    AddPropModal,
    NoEntities,
    NameDescModal,
  } from '../../components';
  import {
    GeneralService,
    sdk,
    StoreService,
    EntityManagerService,
    popup,
  } from '../../services';

  export let id: string = undefined;

  const groupStoreUnsub = StoreService.subscribe('group', async (value) => {
    if (value) {
      groups = value;
      if (group) {
        group = groups.find((e) => e._id === group._id);
      }
    }
  });
  const pathUnsub = StoreService.subscribe('path', async (value) => {
    const link = value as string;
    if (link.startsWith('/dashboard/group/editor')) {
      const tempId = link.split('/')[link.split('/').length - 1];
      if (tempId === '-') {
        group = groups[0];
      } else {
        id = tempId;
        group = groups.find((e) => e._id === id);
      }
    }
  });
  let groups: Group[] = [];
  let group: Group;
  let editGroupData = {
    label: '',
    desc: '',
  };

  async function create(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        await EntityManagerService.create('group', label, desc);
      },
      async () => {
        popup.success('Group successfully created.');
      }
    );
  }
  async function update(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.update<Group>(
          'group',
          group._id,
          label,
          desc
        );
      },
      async (grp: Group) => {
        group = grp;
        popup.success('Group updated successfully.');
      }
    );
  }
  async function remove() {
    if (confirm('Are you sure you want to delete the group?')) {
      await GeneralService.errorWrapper(
        async () => {
          await EntityManagerService.delete('group', group._id);
        },
        async () => {
          popup.success('Group was successfully deleted.');
        }
      );
    }
  }
  async function addProp(prop: Prop) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.addProp('group', group._id, prop);
      },
      async (grp: Group) => {
        group = grp;
        popup.success('Property successfully added.');
      }
    );
  }
  async function updateProp(data: {
    name: string;
    label: string;
    required: boolean;
    move: number;
  }) {
    await GeneralService.errorWrapper(
      async () => {
        return EntityManagerService.updateProp(
          'group',
          group._id,
          group.props,
          data
        );
      },
      async (grp: Group) => {
        group = grp;
        popup.success('Property successfully updated.');
      }
    );
  }
  async function removeProp(prop: Prop) {
    if (confirm('Are you sure you want to delete the property.')) {
      await GeneralService.errorWrapper(
        async () => {
          return await EntityManagerService.removeProp(
            'group',
            group._id,
            prop
          );
        },
        async (grp: Group) => {
          group = grp;
          popup.success('Property successfully deleted.');
        }
      );
    }
  }

  onMount(async () => {
    StoreService.update('group', await sdk.group.getAll());
    if (!id || id === '-') {
      group = groups[0];
      GeneralService.navigate(`/dashboard/group/editor/${groups[0]._id}`);
    } else {
      group = groups.find((e) => e._id === id);
    }
  });
  onDestroy(() => {
    groupStoreUnsub();
    pathUnsub();
  });
</script>

<Layout>
  <div class="gm">
    <ManagerLayout
      label="GROUPS"
      actionText="Add new Group"
      on:action={() => {
        StoreService.update('NameDescModal', true);
      }}
      items={groups.map((e, i) => {
        return { name: e.label, link: `/dashboard/group/editor/${e._id}`, selected: group && group._id === e._id };
      })}>
      {#if groups.length > 0}
        {#if group}
          <EntityInfo
            id={group._id}
            createdAt={group.createdAt}
            updatedAt={group.updatedAt}
            name={group.label}
            description={group.desc}
            on:edit={() => {
              editGroupData.label = group.label;
              editGroupData.desc = group.desc;
              StoreService.update('NameDescModal', true);
            }}
            on:delete={() => {
              remove();
            }} />
          <PropListTable
            class="mt--50"
            props={group.props}
            on:edit={(event) => {
              updateProp(event.detail);
            }}
            on:delete={(event) => {
              removeProp(event.detail);
            }}
            on:add={() => {
              StoreService.update('AddPropModal', true);
            }} />
        {/if}
      {:else}
        <NoEntities
          name="Groups"
          on:action={() => {
            StoreService.update('NameDescModal', true);
          }} />
      {/if}
    </ManagerLayout>
  </div>
  <AddPropModal
    on:done={(event) => {
      addProp(event.detail);
    }} />
  <NameDescModal
    title="Create/Update a group"
    name={editGroupData.label}
    desc={editGroupData.desc}
    on:cancel={() => {
      editGroupData.label = '';
      editGroupData.desc = '';
    }}
    on:done={(event) => {
      if (editGroupData.label !== '') {
        editGroupData.label = '';
        editGroupData.desc = '';
        update(event.detail.name, event.detail.desc);
      } else {
        create(event.detail.name, event.detail.desc);
      }
    }} />
</Layout>
