const KEY = 'pb-ahadi:member-id'

// localStorage bisa melempar error (mode privat / data situs diblokir)
export const getMemberId = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export const setMemberId = (id) => {
  try { localStorage.setItem(KEY, id) } catch { /* abaikan */ }
}
export const clearMemberId = () => {
  try { localStorage.removeItem(KEY) } catch { /* abaikan */ }
}
