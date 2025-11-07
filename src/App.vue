<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Ana Sayfa</RouterLink>
        <RouterLink to="/auth/login">Giriş Yap</RouterLink>
        <RouterLink to="/auth/register">Kayıt Ol</RouterLink>
      </nav>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  background-color: #f8f9fa;
  color: #212529;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  font-weight: normal;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2rem;
}

header {
  line-height: 1.5;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 1rem;
}

nav {
  width: 100%;
  font-size: 1rem;
  text-align: center;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid #dee2e6;
  color: #495057;
  text-decoration: none;
  font-weight: 500;
}

nav a:first-of-type {
  border: 0;
}

nav a.router-link-exact-active {
  color: #0d6efd;
  font-weight: 700;
}
</style>
