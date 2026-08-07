<script lang="ts">
  import katex from 'katex';

  export let latex = '';
  export let displayMode = false;

  $: rendered = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false
  });
</script>

<div class:display={displayMode} class="formula-math">
  {@html rendered}
</div>

<style>
  .formula-math {
    min-width: 0;
    overflow: hidden;
    color: #edf2f4;
    font-size: 19px;
    line-height: 1.25;
  }

  .formula-math.display {
    font-size: 23px;
  }

  .formula-math :global(.katex-display) {
    margin: 0;
    overflow: hidden;
  }
</style>
