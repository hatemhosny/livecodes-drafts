import type { CustomTypeOptions } from 'i18next';

// eslint-disable-next-line import/no-internal-modules
import { predefinedValues } from '../utils/utils';

// eslint-disable-next-line import/no-internal-modules
import { customEvents } from '../events/custom-events';

interface TagElement {
  name: string;
  attributes?: Record<string, string>;
}

// Only used in ./i18n.ts, could remove `export` once it's no longer used
export const abstractifyHTML = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements: TagElement[] = [];
  let counter = 0;

  const replaceElement = (node: HTMLElement) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    node.childNodes.forEach((child) => {
      replaceElement(child as HTMLElement);
    });

    const name = node.tagName.toLowerCase();
    if (name === 'body') return;

    const attributes =
      node.attributes.length === 0
        ? undefined
        : Array.from(node.attributes).reduce(
            (acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            },
            {} as Record<string, string>,
          );

    elements.push({ name, attributes });

    const newElement = doc.createElement(`tag-${counter}`);
    while (node.firstChild) {
      newElement.appendChild(node.firstChild);
    }

    // node.parentNode is always defined because we're traversing from the body
    node.parentNode!.replaceChild(newElement, node);

    counter++;
  };

  replaceElement(doc.body);
  return {
    html: doc.body.innerHTML.replace(/tag-/g, '').replace(/\s+/g, ' ').trim(),
    elements,
  };
};

const unabstractifyHTML = (html: string, elements: TagElement[]) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    html.replace(/<(\/?)([0-9]+)([^>]*)>/g, '<$1tag-$2 $3>'),
    'text/html',
  );

  elements.forEach((element, index) => {
    const oldElement = doc.body.querySelector(`tag-${index}`)!;
    const newElement = doc.createElement(element.name);

    // Copy previously saved attributes to newElement
    if (element.attributes) {
      Object.entries(element.attributes).forEach(([key, value]) => {
        newElement.setAttribute(key, value);
      });
    }

    // Override attributes base on those from abstract tags (oldElement)
    if (oldElement.attributes) {
      Array.from(oldElement.attributes).forEach((attr) => {
        newElement.setAttribute(attr.name, attr.value);
      });
    }

    // Copy the children from oldElement to newElement
    while (oldElement.firstChild) {
      newElement.appendChild(oldElement.firstChild);
    }

    oldElement.replaceWith(newElement);
  });

  return doc.body.innerHTML;
};

export const translate = (
  container: HTMLElement,
  i18n: typeof import('./i18n').default | undefined,
) => {
  if (!container || !i18n) return;

  container.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;

    const translateProp = (prop: string, lookupKey: string) => {
      const interpolation = {
        PROP: prop,
        ...predefinedValues,
      };
      if (prop.startsWith('data-')) {
        prop = prop.slice(5);
        el.dataset[prop] = i18n.t(lookupKey, {
          defaultValue: el.dataset[prop]!,
          ...interpolation,
        }) as string;
      } else {
        const translation = i18n.t(lookupKey, {
          defaultValue: (el as any)[prop],
          ...interpolation,
        }) as string;
        if (prop === 'innerHTML' && el.innerHTML !== translation) {
          const { elements } = abstractifyHTML(el.innerHTML);
          el.innerHTML = unabstractifyHTML(translation, elements);
        } else {
          (el as any)[prop] = translation;
        }
      }
    };

    const props = (el.dataset.i18nProp || 'textContent').split(' ');

    if (props.length === 1) {
      translateProp(props[0], key);
    } else {
      props.forEach((prop) => {
        translateProp(prop, `${key}.${prop}`);
      });
    }
  });
};

type GetNamespaceBase<
  Base extends CustomTypeOptions['resources'],
  Key extends string,
> = Key extends `${infer Namespace}:${infer _Rest}`
  ? Namespace extends keyof Base
    ? Base[Namespace]
    : never
  : Base[CustomTypeOptions['defaultNS']];

type GetTranslation<Base, Key extends string> = Key extends `${infer Start}.${infer Rest}`
  ? Start extends keyof Base
    ? Rest extends string
      ? GetTranslation<Base[Start], Rest>
      : never
    : never
  : Key extends keyof Base
    ? Base[Key]
    : never;

type InferKeys<Base, isNs extends boolean = false, KeyStr extends string = ''> = {
  [K in keyof Base]: Base[K] extends object
    ? KeyStr extends '' // Whether it is of first level (namespace)
      ? InferKeys<Base[K], true, `${K & string}`>
      : KeyStr extends CustomTypeOptions['defaultNS'] // Default namespace and colon can be omited
        ?
            | InferKeys<Base[K], false, `${KeyStr}${isNs extends true ? ':' : '.'}${K & string}`>
            | InferKeys<Base[K], false, `${K & string}`>
        : InferKeys<Base[K], false, `${KeyStr}${isNs extends true ? ':' : '.'}${K & string}`>
    : `${KeyStr}${KeyStr extends '' ? '' : '.'}${K & string}`;
}[keyof Base];

type ExtractInterpolations<Value> =
  Value extends `${infer _First}{{${infer Interpolation}}}${infer Rest}`
    ? Interpolation | ExtractInterpolations<Rest>
    : never;

interface I18nOptions {
  isHTML?: boolean;
}

declare const emptyObjectSymbol: unique symbol;
export interface EmptyObject {
  [emptyObjectSymbol]?: never;
}

export type I18nOptionalInterpolation<T> =
  I18nInterpolationType<T> extends EmptyObject
    ? [I18nOptions?]
    : [I18nInterpolationType<T> & I18nOptions];

export type I18nKeyType = InferKeys<CustomTypeOptions['resources'], true>;
export type I18nValueType<K extends I18nKeyType> = GetTranslation<
  GetNamespaceBase<CustomTypeOptions['resources'], K>,
  K
>;
export type I18nInterpolationType<Value> = {
  [K in ExtractInterpolations<Value>]?: string | number;
};

export const translateString = <Key extends I18nKeyType>(
  i18n: typeof import('./i18n').default | undefined,
  key: Key,
  value: I18nValueType<Key>,
  ...args: I18nOptionalInterpolation<I18nValueType<Key>>
) => {
  if (!i18n) return value as string;

  const interpolation = args[0];
  const translation = i18n.t(key, {
    ...interpolation,
    ...predefinedValues,
    defaultValue: value as string,
  }) as string;

  if (!interpolation || !interpolation.isHTML) {
    return translation;
  } else {
    const { elements } = abstractifyHTML(value as string);
    return unabstractifyHTML(translation, elements);
  }
};

export const dispatchTranslationEvent = (elem: HTMLElement) => {
  elem.dispatchEvent(new CustomEvent(customEvents.i18n, { bubbles: true }));
};