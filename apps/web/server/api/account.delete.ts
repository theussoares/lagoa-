import { callApi } from '../utils/apiCall'

export default defineEventHandler((event) => callApi(event, { method: 'DELETE', path: '/customer/account' }))
