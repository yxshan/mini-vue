export function isObject(val: any) {
  return typeof val === 'object' && val !== null
}

export function hasChanged(oldVal: any, newVal: any) {
  return oldVal !== newVal && oldVal === oldVal && newVal == newVal
}

export function isArray(target: any) {
  return Array.isArray(target)
}

export function isFunction(target: any) {
  return typeof target === 'function'
}

export function isNumber(target: any) {
  return typeof target === 'number'
}

export function isString(target: any) {
  return typeof target === 'string'
}

export function isBoolean(target: any) {
  return typeof target === 'boolean'
}
