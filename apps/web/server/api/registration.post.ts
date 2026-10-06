import { callApi } from '../utils/apiCall'

/** Primeiro acesso: o celular vem do token, o corpo vai vazio. */
export default defineEventHandler((event) => callApi(event, { method: 'POST', path: '/customer/registration', body: {} }))
