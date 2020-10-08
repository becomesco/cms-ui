<script context="module" lang="ts">
  export const cache: Array<{
    id: string;
    b64: string;
  }> = [];
</script>

<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { MediaAggregate, MediaType } from '@becomes/cms-sdk';
  import {
    GeneralService,
    MediaService,
    sdk,
    StoreService,
    popup,
  } from '../../services';
  import Button from '../button.svelte';
  import { MediaAddUpdateFolderModal, MediaAddFileModal } from '../modals';
  import Spinner from '../spinner.svelte';
  import ProgressBar from '../progress-bar.svelte';

  export { className as class };
  export let inModal: boolean = false;

  const dispatch = createEventDispatcher();
  const mediaStoreUnsub = StoreService.subscribe(
    'media',
    async (value: MediaAggregate[]) => {
      if (value) {
        mediaFiles = value;
        if (mediaFile) {
          setActiveView(mediaFile._id);
        } else {
          setActiveView();
        }
      }
    }
  );
  const editFolderData = {
    id: '',
    name: '',
  };
  const editFileData = {
    id: '',
    name: '',
  };
  let inModalSelectedMediaId: string = '';
  let className = '';
  let mediaFiles: MediaAggregate[] = [];
  let mediaFile: MediaAggregate & {
    parentId: string;
    dirs: MediaAggregate[];
    files: MediaAggregate[];
  };
  let uploadStatus = {
    show: false,
    progress: 0,
    filename: '',
  };
  const filesCount = 12;
  let showFilesCount = 0 + filesCount;

  async function createFolder(name: string, parentId?: string) {
    if (parentId === '') {
      parentId = undefined;
    }
    await GeneralService.errorWrapper(
      async () => {
        await sdk.media.addDir({
          name,
          parentId,
        });
      },
      async () => {
        StoreService.update('media', await sdk.media.getAllAggregated());
        popup.success('Folder successfully created.');
      }
    );
  }
  async function updateFolder(parentId: string, name: string) {}
  async function createFiles(parentId: string, name: string, files: File[]) {
    uploadStatus.show = true;
    uploadStatus.filename = '';
    uploadStatus.progress = 0;
    const errors = await MediaService.createFiles(
      parentId,
      name,
      files,
      (filename, event) => {
        uploadStatus.filename = filename;
        uploadStatus.progress = (100 / event.total) * event.loaded;
      }
    );
    uploadStatus.show = false;
    if (errors.length > 0) {
      console.error(errors);
      popup.error(
        'Upload completed with errors.' +
          ' See console for more information.' +
          ' This files were not uploaded: ' +
          errors.map((e) => e.filename).join(', ')
      );
    } else {
      popup.success('Files uploaded successfully.');
    }
    StoreService.update('media', await sdk.media.getAllAggregated());
  }
  async function remove(id: string) {
    if (confirm('Are you sure?')) {
      await GeneralService.errorWrapper(
        async () => {
          await sdk.media.deleteById(id);
        },
        async () => {
          StoreService.update('media', await sdk.media.getAllAggregated());
          setActiveView(mediaFile._id);
        }
      );
    }
  }
  function mediaToBase64Image(media: MediaAggregate) {
    GeneralService.errorWrapper(
      async () => {
        const cached = cache.find((e) => e.id === media._id);
        if (cached) {
          return { fromCache: true, b64: cached.b64 };
        }
        return { fromCache: false, b64: await sdk.media.getBinary(media._id, 'small') };
      },
      async (data: { fromCache: boolean; b64: string | Buffer }) => {
        let b64: string;
        if (data.fromCache) {
          b64 = data.b64 as string;
        } else {
          b64 = GeneralService.b64.fromBuffer(data.b64 as Buffer);
          cache.push({
            id: media._id,
            b64,
          });
        }
        document
          .getElementById(media._id)
          .setAttribute('src', `data:${media.mimetype};base64,${b64}`);
      }
    );
    return media._id;
  }
  async function setActiveView(dirId?: string) {
    if (typeof dirId === 'undefined') {
      dirId = '';
    }
    if (dirId === '') {
      mediaFile = {
        _id: '',
        createdAt: 0,
        isInRoot: true,
        mimetype: '',
        name: '',
        path: 'root',
        size: 0,
        state: false,
        type: MediaType.DIR,
        updatedAt: 0,
        userId: '',
        children: [],
        parentId: '',
        ...splitMedia(
          mediaFiles.map((e) => {
            const output: MediaAggregate = JSON.parse(JSON.stringify(e));
            output.children = undefined;
            return output;
          })
        ),
      };
    } else {
      const media = await sdk.media.getAggregated(dirId);
      const parent = await sdk.media.get(media._id);
      mediaFile = {
        ...media,
        parentId: parent.parentId,
        ...splitMedia(
          media.children.map((e) => {
            const output: MediaAggregate = JSON.parse(JSON.stringify(e));
            output.children = undefined;
            return output;
          })
        ),
      };
    }
  }
  function splitMedia(media: MediaAggregate[]) {
    const dirs: MediaAggregate[] = [];
    const files: MediaAggregate[] = [];
    for (const i in media) {
      if (media[i].type === MediaType.DIR) {
        dirs.push(media[i]);
      } else {
        files.push(media[i]);
      }
    }
    dirs.sort((a, b) => {
      if (a.name > b.name) return 1;
      else if (a.name < b.name) return -1;
      return 0;
    });
    // files.sort((a, b) => {
    //   if (a.name > b.name) return 1;
    //   else if (a.name < b.name) return -1;
    //   return 0;
    // });
    return {
      dirs,
      files,
    };
  }
  function showMoreFiles() {
    showFilesCount = showFilesCount + filesCount;
  }
  function openMedia(media: MediaAggregate) {
    const cached = cache.find((e) => e.id === media._id);
    if (cached) {
      window.open(`data:${media.mimetype};base64,${cached.b64}`, '_blank');
    }
  }

  onMount(async () => {
    await GeneralService.errorWrapper(
      async () => {
        return await sdk.media.getAllAggregated();
      },
      async (media: MediaAggregate[]) => {
        StoreService.update('media', media);
        setActiveView();
      }
    );
  });
  onDestroy(async () => {
    mediaStoreUnsub();
  });
</script>

<div class="media-viewer {className}">
  {#if mediaFile}
    <div class="media-viewer--location">
      /media{mediaFile.path === 'root' ? '' : mediaFile.path}
    </div>
    <div class="media-viewer--actions">
      <Button
        icon="fas fa-file"
        on:click={() => {
          StoreService.update('MediaAddFileModal', true);
        }}>
        Upload file
      </Button>
      <Button
        class="ml--10"
        kind="secondary"
        icon="fas fa-folder"
        on:click={() => {
          StoreService.update('MediaAddUpdateFolderModal', true);
        }}>
        Create folder
      </Button>
      {#if mediaFile._id !== ''}
        <Button
          class="ml--10"
          kind="ghost"
          icon="fas fa-chevron-left"
          on:click={() => {
            showFilesCount = 0 + filesCount;
            setActiveView(mediaFile.parentId);
          }}>
          Go back
        </Button>
      {/if}
    </div>
    {#if mediaFile.dirs.length === 0 && mediaFile.files.length === 0}
      <div class="media-viewer--no-files">
        <div class="message">This folder is empty.</div>
      </div>
    {:else}
      {#if mediaFile.dirs.length > 0}
        <h4 class="mt--50">Folders</h4>
        <div class="media-viewer--grid">
          {#each mediaFile.dirs as media}
            <div class="media-viewer--dir">
              <button
                class="open"
                on:click={() => {
                  showFilesCount = 0 + filesCount;
                  setActiveView(media._id);
                }}>
                <div class="fas fa-folder icon" />
                <div class="name">
                  {GeneralService.string.toShort(media.name, 40)}
                </div>
              </button>
              <Button
                kind="ghost"
                icon="fas fa-times"
                onlyIcon={true}
                on:click={() => {
                  remove(media._id);
                }} />
            </div>
          {/each}
        </div>
      {/if}
      {#if mediaFile.files.length > 0}
        <h4 class="mt--50">Files</h4>
        <div class="media-viewer--grid">
          {#each mediaFile.files as media, i}
            {#if showFilesCount > i}
              <div
                class="media-viewer--file {inModal ? (inModalSelectedMediaId === media._id ? 'media-viewer--file-selected' : '') : ''}">
                <div class="heading">
                  <button
                    class="open"
                    on:click={() => {
                      if (inModal) {
                        inModalSelectedMediaId = media._id;
                        dispatch('selected', media);
                      } else {
                        openMedia(media);
                      }
                    }}>
                    <div class="fas fa-folder icon" />
                    <div class="name">
                      {GeneralService.string.toShort(media.name, 40)}
                    </div>
                  </button>
                  <Button
                    class="ml--auto"
                    kind="ghost"
                    icon="fas fa-times"
                    onlyIcon={true}
                    on:click={() => {
                      remove(media._id);
                    }} />
                </div>
                {#if media.type === MediaType.IMG}
                  <div class="img-wrapper">
                    <img
                      id={mediaToBase64Image(media)}
                      src=""
                      alt="Loading..."
                      on:click={() => {
                        if (inModal) {
                          inModalSelectedMediaId = media._id;
                          dispatch('selected', media);
                        } else {
                          openMedia(media);
                        }
                      }} />
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
        {#if mediaFile.files.length > showFilesCount}
          <div class="media-viewer--show-more">
            <Button
              kind="ghost"
              icon="fas fa-chevron-circle-down"
              on:click={() => {
                showMoreFiles();
              }}>
              Show more
            </Button>
          </div>
        {/if}
      {/if}
    {/if}
  {/if}
</div>
<MediaAddUpdateFolderModal
  id={editFolderData.id}
  name={editFolderData.name}
  on:cancel={() => {
    editFolderData.id = '';
    editFolderData.name = '';
  }}
  on:done={(event) => {
    if (editFolderData.id !== '') {
      editFolderData.id = '';
      editFolderData.name = '';
      updateFolder(event.detail.id, event.detail.name);
    } else {
      createFolder(event.detail.name, mediaFile._id);
    }
  }} />
<MediaAddFileModal
  parentId={mediaFile ? mediaFile._id : ''}
  on:done={(event) => {
    createFiles(event.detail.parentId, event.detail.name, event.detail.files);
  }} />
<Spinner show={uploadStatus.show}>
  <div class="media-viewer--upload-file-name">{uploadStatus.filename}</div>
  <ProgressBar class="ml--auto mr--auto" progress={uploadStatus.progress} />
</Spinner>
