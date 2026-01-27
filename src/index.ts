import type { UserConfig } from 'vite';
import path, { resolve, relative, extname } from 'path';
import { globSync } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs, { readFileSync } from 'fs';

export interface TcHmiPresetOptions {
    liveviewUrl: string;
    namespace: string;
    port?: number;
    sourceDir?: string;
    format?: 'es' | 'umd';
}

export function tchmiPreset(options: TcHmiPresetOptions): UserConfig {
    const { liveviewUrl, namespace, port = 5173, sourceDir = 'src', format = 'es' } = options;
    const liveview = new URL(liveviewUrl);

    const files = globSync(`${sourceDir}/**/[Ss]cript.{ts,tsx,js,jsx}`);
    const entries = Object.fromEntries(
        files.map((file) => {
            const name = relative(sourceDir, file.slice(0, -extname(file).length));
            return [name, resolve(process.cwd(), file)];
        })
    );

    const root = process.cwd();
    const host = 'localhost';
    let resolvedViteUrl = `http://${host}:${port}`;

    return {
        server: {
            host: host,
            port: port,
            hmr: {
                path: '/vite-hmr',
            },
            proxy: {
                '/': {
                    target: liveview.origin,
                    changeOrigin: true,
                    ws: true,
                    bypass: (req, _) => {
                        const url = req.url || '';

                        if (url.includes('@vite') || url.includes('vite-hmr') || url.includes('node_modules')) {
                            return url;
                        }

                        if (url.includes(sourceDir)) {
                            return url;
                        }

                        if (url.includes('Beckhoff.') || url.endsWith('Manifest.json')) {
                            return null;
                        }

                        return null;
                    }
                }
            }
        },

        plugins: [
            {
                name: 'get-actual-port',
                configureServer(server) {
                    server.httpServer?.once('listening', () => {
                        const address = server.httpServer?.address();
                        if (address && typeof address !== 'string') {
                            resolvedViteUrl = `http://${host}:${address.port}`;
                        }
                    });
                }
            },
            {
                name: 'tchmi-control-resolver',
                configureServer(server) {
                    server.middlewares.use((req, _, next) => {
                        if (req.url && req.url.includes(namespace)) {
                            console.log(req.url);
                            let [urlPath, query] = req.url.split('?');

                            if (!urlPath.startsWith(`/${sourceDir}/`)) {
                                urlPath = urlPath.replace(namespace, sourceDir);
                            }

                            if (urlPath.endsWith('.js')) {
                                const basePath = urlPath.slice(0, -3);
                                const absolutePath = path.join(root, basePath);

                                const extensions = ['.tsx', '.ts', '.js'];

                                for (const ext of extensions) {
                                    if (fs.existsSync(absolutePath + ext)) {
                                        urlPath = basePath + ext;
                                        console.log(1, urlPath);
                                        break;
                                    }
                                }
                                console.log(2, urlPath);
                            }

                            req.url = urlPath + (query ? '?' + query : '');
                            console.log(req.url);
                        }
                        next();
                    });
                }
            },
            {
                name: 'proxy-remote-index',
                configureServer(server) {
                    server.middlewares.use(async (req, res, next) => {
                        const url = req.url || '/';
                        if (url === '/' || url.startsWith('/index.html') || url.startsWith(liveview.pathname)) {
                            try {
                                const response = await fetch(liveview.href);
                                let html = await response.text();

                                html = html.replace('<head>', `<head><script type="module" src="/@vite/client"></script>`);

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'text/html');
                                res.end(html);
                                return;
                            } catch (e) {
                                console.error('Error fetching HTML from the Beckhoff server:', e);
                            }
                        }
                        next();
                    });
                }
            },
            viteStaticCopy({
                targets: [
                    { src: '*.hmiextproj', dest: '.' },
                    { src: `${sourceDir}/**/Manifest.json`, dest: '.' },
                    {
                        src: [
                            `${sourceDir}/**/Description.json`,
                            `${sourceDir}/**/Style.css`,
                            `${sourceDir}/**/Template.html`
                        ],
                        dest: '.',
                        rename: (_n, _e, p) => path.relative(sourceDir, p)
                    }
                ]
            }),
            {
                name: 'fix-transform-error',
                transformIndexHtml: {
                    order: 'pre',
                    handler(html) {
                        return html.replace(
                            /src="\/Beckhoff\./g,
                            `src="${resolvedViteUrl}/Beckhoff.`
                        );
                    }
                }
            },
            {
                name: 'template-loader-plugin',
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        if (!req.url) {
                            next();
                            return;
                        }

                        const [urlPath] = req.url.split('?');

                        if (urlPath.toLowerCase().includes('template.html')) {

                            try {
                                const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
                                const filePath = path.resolve(root, relativePath);

                                if (fs.existsSync(filePath)) {
                                    const content = readFileSync(filePath, 'utf-8');

                                    res.setHeader('Content-Type', 'text/html');
                                    res.setHeader('Cache-Control', 'no-cache');

                                    res.end(content);
                                    return;
                                }
                            } catch (e) {
                                console.error('Error loading template:', e);
                            }
                        }
                        next();
                    });
                }
            },
        ],
        build: {
            outDir: 'dist',
            lib: {
                entry: entries,
                formats: [format]
            },
            rollupOptions: {
                external: [
                    'Beckhoff.TwinCAT.HMI.Framework',
                    'Beckhoff.TwinCAT.HMI.Controls',
                ],
                output: {
                    entryFileNames: '[name].js',
                }
            }
        }
    };
}