<script lang="ts">
  import { beforeUpdate, createEventDispatcher } from 'svelte';
  import type { APIFunction } from '@becomes/cms-sdk';
  import { CheckboxInput } from './input';

  export { className as class };
  export let title = '';
  export let checked: boolean = false;
  export let initialValue: APIFunction = {
    _id: '',
    public: false,
  };

  type Data = APIFunction & {
    checked: boolean;
    disabled: boolean;
  };

  const dispatch = createEventDispatcher();
  let className = '';
  let data: Data = getData();
  function getData(): Data {
    return {
      _id: initialValue._id ? '' + initialValue._id : '',
      public: initialValue.public ? true : false,
      checked: initialValue.public ? true : checked ? true : false,
      disabled: initialValue.public ? true : false,
    };
  }
  beforeUpdate(() => {
    data = getData();
  });
</script>

<div class="fn-policy {data.disabled ? 'fn-policy--disabled' : ''} {className}">
  <h4>{title}</h4>
  <div class="fn-policy--options">
    <CheckboxInput
      value={data.checked}
      disabled={data.disabled}
      label="Can call a function"
      on:input={(event) => {
        dispatch('change', event.detail);
      }} />
  </div>
</div>
