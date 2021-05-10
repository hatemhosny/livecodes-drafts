import { loadConfig } from './config';
import { appHTML } from './html';
import { Pen } from './models';

export const localpen = async (container: string, config: Partial<Pen> = {}) =>
  new Promise(async (resolve) => {
    const containerElement = document.querySelector(container);
    if (!containerElement) {
      throw new Error(`Cannot find element with the selector: "${container}"`);
    }

    const mergedConfig = await loadConfig(config);
    const { baseUrl } = mergedConfig;

    if (mergedConfig.showVersion) {
      // variables added in scripts/build.js
      const version = process.env.VERSION || '';
      const commitSHA = process.env.GIT_COMMIT || '';
      const repoUrl = process.env.REPO_URL || '';

      // eslint-disable-next-line no-console
      console.log(`Version: ${version} (${repoUrl}/releases/tag/v${version})`);
      // eslint-disable-next-line no-console
      console.log(`Git commit: ${commitSHA} (${repoUrl}/commit/${commitSHA})`);
    }

    const style = document.createElement('style');
    style.innerHTML = `
        ${container} {
            min-width: 300px;
            min-height: 200px;
            padding: 0;
            overflow: hidden;
        }
        ${container} > iframe {
            border: 0;
            width: 100%;
            height: 100%;
        }
        ${container}.embed iframe {
            width: calc(100% - 2px);
            height: calc(100% - 2px);
            border: 1px solid #001b25;
            border-radius: 5px;
        }
    `;
    document.body.appendChild(style);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    containerElement.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(appHTML.replace(/{{baseUrl}}/g, baseUrl));
    iframe.contentWindow?.document.close();

    iframe.addEventListener('load', async () => {
      const app = (iframe.contentWindow as any)?.app;
      if (typeof app === 'function') {
        const pen = await app(mergedConfig);
        iframe.style.display = 'block';

        // eslint-disable-next-line no-underscore-dangle
        const callback = (window as any).__localpenEmbed;
        if (typeof callback === 'function') {
          callback();
        }

        resolve(pen);
      }
    });
  });
