<script lang="ts">
  import { onMount, onDestroy, beforeUpdate } from 'svelte';
  import type { Prop, Template } from '@becomes/cms-sdk';
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
    EntityManagerService,
    GeneralService,
    sdk,
    StoreService,
    popup,
  } from '../../services';

  export let id: string = undefined;
  const templateStoreUnsub = StoreService.subscribe(
    'template',
    async (value) => {
      if (value) {
        templates = value;
        if (template) {
          template = templates.find((e) => e._id === template._id);
        }
      }
    }
  );
  const pathUnsub = StoreService.subscribe('path', async (value) => {
    const link = value as string;
    if (link.startsWith('/dashboard/template/editor')) {
      const tempId = link.split('/')[link.split('/').length - 1];
      if (tempId === '-') {
        template = templates[0];
      } else {
        id = tempId;
        template = templates.find((e) => e._id === id);
      }
    }
  });
  let templates: Template[] = [];
  let template: Template;
  let editTemplateData = {
    name: '',
    desc: '',
  };

  async function create(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        await EntityManagerService.create('template', label, desc);
      },
      async () => {
        popup.success('Template successfully created.');
      }
    );
  }
  async function update(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.update<Template>(
          'template',
          template._id,
          label,
          desc
        );
      },
      async (tmp: Template) => {
        template = tmp;
        popup.success('Template updated successfully.');
      }
    );
  }
  async function remove() {
    if (confirm('Are you sure you want to delete the template?')) {
      await GeneralService.errorWrapper(
        async () => {
          await EntityManagerService.delete('template', template._id);
        },
        async () => {
          popup.success('Template was successfully deleted.');
        }
      );
    }
  }
  async function addProp(prop: Prop) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.addProp(
          'template',
          template._id,
          prop
        );
      },
      async (value: Template) => {
        template = value;
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
          'template',
          template._id,
          template.props,
          data
        );
      },
      async (value: Template) => {
        template = value;
        popup.success('Property successfully updated.');
      }
    );
  }
  async function removeProp(prop: Prop) {
    if (confirm('Are you sure you want to delete the property.')) {
      await GeneralService.errorWrapper(
        async () => {
          return await EntityManagerService.removeProp(
            'template',
            template._id,
            prop
          );
        },
        async (value: Template) => {
          template = value;
          popup.success('Property successfully deleted.');
        }
      );
    }
  }

  onMount(async () => {
    StoreService.update('template', await sdk.template.getAll());
    if (!id || id === '-') {
      template = templates[0];
      GeneralService.navigate(`/dashboard/template/editor/${templates[0]._id}`);
    } else {
      template = templates.find((e) => e._id === id);
    }
  });
  beforeUpdate(async () => {
    if (id === '-') {
      template = templates[0];
    } else {
      template = templates.find((e) => e._id === id);
    }
  });
  onDestroy(() => {
    pathUnsub();
    templateStoreUnsub();
  });
</script>

<Layout>
  <div class="tm">
    <ManagerLayout
      label="TEMPLATES"
      actionText="Add new Template"
      on:action={() => {
        StoreService.update('NameDescModal', true);
      }}
      items={templates.map((e, i) => {
        return { name: e.label, link: `/dashboard/template/editor/${e._id}`, selected: template && template._id === e._id };
      })}>
      {#if templates.length > 0}
        {#if template}
          <EntityInfo
            id={template._id}
            createdAt={template.createdAt}
            updatedAt={template.updatedAt}
            name={template.label}
            description={template.desc}
            on:edit={() => {
              editTemplateData.name = template.label;
              editTemplateData.desc = template.desc;
              StoreService.update('NameDescModal', true);
            }}
            on:delete={() => {
              remove();
            }} />
          <PropListTable
            class="mt--50"
            props={template.props}
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
          name="Templates"
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
    title="Create/Update a template"
    name={editTemplateData.name}
    desc={editTemplateData.desc}
    on:cancel={() => {
      editTemplateData.name = '';
      editTemplateData.desc = '';
    }}
    on:done={(event) => {
      if (editTemplateData.name !== '') {
        editTemplateData.name = '';
        editTemplateData.desc = '';
        update(event.detail.name, event.detail.desc);
      } else {
        create(event.detail.name, event.detail.desc);
      }
    }} />
</Layout>
