<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Widget, Prop } from '@becomes/cms-sdk';
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

  const widgetStoreUnsub = StoreService.subscribe('widget', async (value) => {
    if (value) {
      widgets = value;
      if (widget) {
        widget = widgets.find((e) => e._id === widget._id);
      }
    }
  });
  const pathUnsub = StoreService.subscribe('path', async (value) => {
    const link = value as string;
    if (link.startsWith('/dashboard/widget/editor')) {
      const tempId = link.split('/')[link.split('/').length - 1];
      if (tempId === '-') {
        widget = widgets[0];
      } else {
        id = tempId;
        widget = widgets.find((e) => e._id === id);
      }
    }
  });
  let widgets: Widget[] = [];
  let widget: Widget;
  let editWidgetData = {
    label: '',
    desc: '',
  };

  async function create(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        await EntityManagerService.create('widget', label, desc);
      },
      async () => {
        popup.success('Widget successfully created.');
      }
    );
  }
  async function update(label: string, desc: string) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.update<Widget>(
          'widget',
          widget._id,
          label,
          desc
        );
      },
      async (value: Widget) => {
        widget = value;
        popup.success('Widget updated successfully.');
      }
    );
  }
  async function remove() {
    if (confirm('Are you sure you want to delete the widget?')) {
      await GeneralService.errorWrapper(
        async () => {
          await EntityManagerService.delete('widget', widget._id);
        },
        async () => {
          popup.success('Widget was successfully deleted.');
        }
      );
    }
  }
  async function addProp(prop: Prop) {
    await GeneralService.errorWrapper(
      async () => {
        return await EntityManagerService.addProp('widget', widget._id, prop);
      },
      async (value: Widget) => {
        widget = value;
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
          'widget',
          widget._id,
          widget.props,
          data
        );
      },
      async (value: Widget) => {
        widget = value;
        popup.success('Property successfully updated.');
      }
    );
  }
  async function removeProp(prop: Prop) {
    if (confirm('Are you sure you want to delete the property.')) {
      await GeneralService.errorWrapper(
        async () => {
          return await EntityManagerService.removeProp(
            'widget',
            widget._id,
            prop
          );
        },
        async (value: Widget) => {
          widget = value;
          popup.success('Property successfully deleted.');
        }
      );
    }
  }

  onMount(async () => {
    StoreService.update('widget', await sdk.widget.getAll());
    if (!id || id === '-') {
      widget = widgets[0];
      GeneralService.navigate(`/dashboard/widget/editor/${widgets[0]._id}`);
    } else {
      widget = widgets.find((e) => e._id === id);
    }
  });
  onDestroy(() => {
    widgetStoreUnsub();
    pathUnsub();
  });
</script>

<Layout>
  <div class="gm">
    <ManagerLayout
      label="WIDGETS"
      actionText="Add new Widget"
      on:action={() => {
        StoreService.update('NameDescModal', true);
      }}
      items={widgets.map((e, i) => {
        return { name: e.label, link: `/dashboard/widget/editor/${e._id}`, selected: widget && widget._id === e._id };
      })}>
      {#if widgets.length > 0}
        {#if widget}
          <EntityInfo
            id={widget._id}
            createdAt={widget.createdAt}
            updatedAt={widget.updatedAt}
            name={widget.label}
            description={widget.desc}
            on:edit={() => {
              editWidgetData.label = widget.label;
              editWidgetData.desc = widget.desc;
              StoreService.update('NameDescModal', true);
            }}
            on:delete={() => {
              remove();
            }} />
          <PropListTable
            class="mt--50"
            props={widget.props}
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
          name="Widgets"
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
    title="Create/Update a widget"
    name={editWidgetData.label}
    desc={editWidgetData.desc}
    on:cancel={() => {
      editWidgetData.label = '';
      editWidgetData.desc = '';
    }}
    on:done={(event) => {
      if (editWidgetData.label !== '') {
        editWidgetData.label = '';
        editWidgetData.desc = '';
        update(event.detail.name, event.detail.desc);
      } else {
        create(event.detail.name, event.detail.desc);
      }
    }} />
</Layout>
