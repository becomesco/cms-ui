<script lang="ts">
  export { className as class };
  export let icon: string = '';
  export let onlyIcon: boolean = false;
  export let kind: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  export let style: string = undefined;
  export let disabled: boolean = false;

  let className = '';
</script>

<button
  class="{className} btn btn--{kind}"
  {style}
  {disabled}
  on:click>
  {#if icon}
    <span class="{icon} btn--icon {onlyIcon === false ? 'mr--20' : ''}" />
  {/if}
  <slot />
</button>
