<script lang="ts">
  import * as uuid from 'uuid';
  import { beforeUpdate, createEventDispatcher, onMount } from 'svelte';
  import { GeneralService, popup, sdk } from '../../services';
  import { Media, MediaType } from '@becomes/cms-sdk';

  export { className as class };
  export let id: string = uuid.v4();
  export let uri: string = '';
  export let invalidText = '';
  export let customOnClick: boolean = false;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();
  const buffer = {
    uri: '' + uri,
  };
  let className = '';
  let showMessage = true;
  let fileOver = false;
  let thumbnail = '';

  async function setThumbnail(file: File) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        thumbnail = reader.result as string;
        resolve();
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }
  async function handleFiles(fileList: FileList) {
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i = i + 1) {
      files.push(fileList.item(i));
    }
    const imageFile = files.find((e) => e.type.startsWith('image'));
    if (imageFile) {
      try {
        await setThumbnail(imageFile);
      } catch (error) {
        console.error(error);
        popup.error(
          'Some error occurred while parsing. See console for more information.'
        );
        return;
      }
    }
    showMessage = false;
    dispatch('input', files);
  }
  async function setThumbnailFromValue() {
    if (uri) {
      const mediaFiles: Media[] = await GeneralService.errorWrapper(
        async () => {
          return await sdk.media.getAll();
        },
        async (value: Media[]) => {
          return value;
        }
      );
      if (mediaFiles) {
        const media = mediaFiles.find(
          (e) =>
            e.type === MediaType.IMG &&
            (e.path + '/' + e.name).replace(/\/\//g, '/') === uri
        );
        if (media) {
          const buffer: Buffer = await GeneralService.errorWrapper(
            async () => {
              return await sdk.media.getBinary(media._id, 'small');
            },
            async (value: Buffer) => {
              return value;
            }
          );
          thumbnail = `data:${
            media.mimetype
          };base64,${GeneralService.b64.fromBuffer(buffer)}`;
          showMessage = false;
        } else {
          thumbnail = '';
          showMessage = false;
        }
      }
    } else {
      thumbnail = '';
      showMessage = true;
    }
  }

  onMount(async () => {
    await setThumbnailFromValue();
  });
  beforeUpdate(async () => {
    if (buffer.uri !== uri) {
      buffer.uri = '' + uri;
      await setThumbnailFromValue();
    }
  });
</script>

<div class="input {className}">
  {#if invalidText}
    <div class="input--invalid">
      <span class="fas fa-exclamation icon" />
      {invalidText}
    </div>
  {/if}
  <div
    class="input--file {fileOver ? 'input--file-over' : ''}"
    on:dragover={(event) => {
      event.preventDefault();
      if (!disabled) {
        fileOver = true;
      }
    }}
    on:dragend={() => {
      fileOver = false;
    }}
    on:dragleave={() => {
      fileOver = false;
    }}
    on:drop={(event) => {
      event.preventDefault();
      if (!disabled) {
        fileOver = false;
        handleFiles(event.dataTransfer.files);
      } else {
        dispatch('input');
      }
    }}
    on:click={() => {
      if (customOnClick) {
        dispatch('click');
      } else {
        document.getElementById(id).click();
      }
    }}>
    {#if showMessage}
      <span class="input--file-message">Drag and drop file or click to upload</span>
    {:else if thumbnail}
      <img src={thumbnail} alt="thumbnail" />
    {:else}
      <div class="fas fa-file input--file-thumb-default" />
    {/if}
    <input
      {id}
      type="file"
      multiple
      name="file"
      on:change={(event) => {
        handleFiles(event.target.files);
      }} />
  </div>
</div>
