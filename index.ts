import fsp from "fs/promises";
import minifyHtml from "@minify-html/node";
import type { Plugin } from "vite";

const DOT_HTML = ".html";
const postfix = "\x01\x04\x03";

const cleanId = (str: string) => str.substring(0, str.length - postfix.length);

const srcToTemplate = (src: string) =>
    `const template = document.createElement("template");
template.innerHTML = ${JSON.stringify(src)};
export default template;
`;

function htmlImportServe(): Plugin {
    return {
        name: "html-template:serve",
        apply: "serve",
        transform(src, id) {
            if (id.endsWith(DOT_HTML)) {
                return {
                    code: srcToTemplate(src),
                };
            }
        },
    };
}

function htmlImportBuild(): Plugin {
    return {
        name: "html-template:build",
        enforce: "pre",
        apply: "build",
        async resolveId(id, importer, options) {
            if (id.endsWith(DOT_HTML) && !options.isEntry) {
                const res = await this.resolve(id, importer, {
                    skipSelf: true,
                    ...options,
                });

                if (!res || res.external) {
                    return res;
                }

                return res.id + postfix;
            }
        },

        async load(id) {
            if (!id.endsWith(postfix)) {
                return;
            }

            let htmlContent = await fsp.readFile(cleanId(id));
            htmlContent = minifyHtml.minify(htmlContent, {
                allow_removing_spaces_between_attributes: false,
            });

            return srcToTemplate(htmlContent.toString("utf-8"));
        },
    };
}

export default function htmlImport(): Plugin[] {
    return [htmlImportServe(), htmlImportBuild()];
}
