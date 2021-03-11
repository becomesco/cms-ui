<script lang="ts">
  import type { EntryLite, Template, Language } from '@becomes/cms-sdk';
  import { onDestroy, onMount } from 'svelte';
  import {
    GeneralService,
    LocalStorageService,
    NotificationService,
    sdk,
    StoreService,
  } from '../../services';
  import type { EntryModified } from '../../types';
  import { EntryUtil } from '../../util';

  export let params: {
    templateId?: string;
    entryId?: string;
  } = {};
  const templateStoreUnsub = StoreService.subscribe(
    'template',
    async (store: Template[]) => {
      if (store) {
        template = store.find((e) => e._id === params.templateId);
      }
    }
  );
  const entryStoreUnsub = StoreService.subscribe(
    'entry',
    async (store: EntryLite[]) => {
      if (store) {
        if (params.entryId !== '-') {
          entry = EntryUtil.toModified(
            store.find((e) => e._id === params.entryId)
          );
        }
      }
    }
  );
  const languageStoreUnsub = StoreService.subscribe(
    'language',
    async (store: Language[]) => {
      if (store) {
        languages = store;
        let langCode: string = LocalStorageService.get('lang');
        if (!langCode) {
          langCode = languages[0].code;
          LocalStorageService.set('lang', langCode);
        }
        if (!language) {
          language = languages.find((e) => e.code === langCode);
        } else {
          const lang = languages.find((e) => e._id === language._id);
          if (!lang) {
            NotificationService.error(`
              Language in which you are viewing the page has been deleted
              and because of this language was switched to the default one.
            `);
            language = languages.find((e) => e.code === langCode);
          } else {
            language = lang;
          }
        }
      }
    }
  );

  let template: Template;
  let entry: EntryModified;
  let languages: Language[];
  let language: Language;

  onMount(async () => {
    await GeneralService.errorWrapper(
      async () => {
        return {
          template: await sdk.template.get(params.templateId),
          languages: await sdk.language.getAll(),
          entry:
            params.entryId !== '-'
              ? await sdk.entry.get({
                  templateId: params.templateId,
                  id: params.entryId,
                })
              : undefined,
        };
      },
      async (value) => {
        StoreService.set('language', value.languages);
        StoreService.set('template', value.template);
        if (value.entry) {
          StoreService.set('entry', entry);
        } else {
          entry = EntryUtil.instanceModified(
            false,
            value.languages,
            value.template.props
          );
          entry._id = '1';
        }
      }
    );
  });
  onDestroy(() => {
    templateStoreUnsub();
    entryStoreUnsub();
    languageStoreUnsub();
  });
</script>

{#if entry && template && language}
  <h1>Entry</h1>
  <pre><code>{JSON.stringify(entry, null, '  ')}</code></pre>
{/if}
