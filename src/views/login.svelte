<script lang="ts">
  import { onMount } from 'svelte';
  import { blur } from 'svelte/transition';
  import { Button, PasswordInput, TextInput, Spinner } from '../components';
  import { GeneralService, QueryService, sdk, popup } from '../services';

  let user: {
    [key: string]: {
      error: string;
      value: string;
    };
  } = {
    email: {
      value: '',
      error: '',
    },
    password: {
      value: '',
      error: '',
    },
  };
  let loginInProcess: boolean = false;

  async function submit() {
    let error = false;
    Object.keys(user).forEach((key) => {
      if (user[key].value.replace(/ /g, '') === '') {
        user[key].error = 'Input cannot be empty.';
        error = true;
      } else {
        user[key].error = '';
      }
    });
    if (error) {
      return;
    } else {
      loginInProcess = true;
    }
    await GeneralService.errorWrapper(
      async () => {
        try {
          await sdk.user.login(user.email.value, user.password.value);
        } catch (err) {
          popup.error(err.message);
          error = true;
        }
      },
      async () => {
        if (!error) {
          GeneralService.navigate('/dashboard');
        }
        loginInProcess = false;
      }
    );
  }

  onMount(async () => {
    if (await sdk.isLoggedIn()) {
      GeneralService.navigate('/dashboard');
      return;
    }
    if ((await sdk.user.isInitialized()) === false) {
      GeneralService.navigate('/signup-admin');
      return;
    }
    const query = QueryService.get();
    if (query.error) {
      popup.error(query.error);
    }
  });
</script>

<div class="login">
  <div in:blur={{ delay: 250 }} out:blur class="login--wrapper">
    <div class="login--heading">
      <div class="login--heading-welcome">Welcome to</div>
      <h1>Becomes <strong>CMS</strong></h1>
    </div>
    <div class="login--content">
      <h2>Log in</h2>
      <TextInput
        class="mt--20"
        label="Email"
        placeholder="email"
        invalidText={user.email.error}
        on:input={(event) => {
          user.email.value = event.detail;
        }} />
      <PasswordInput
        class="mt--20"
        label="Password"
        placeholder="Password"
        invalidText={user.password.error}
        on:input={(event) => {
          user.password.value = event.detail;
        }}
        on:enter={() => {
          submit();
        }} />
      <Button
        class="mt--50"
        on:click={() => {
          submit();
        }}>
        Submit
      </Button>
    </div>
  </div>
</div>
<Spinner show={loginInProcess} />
