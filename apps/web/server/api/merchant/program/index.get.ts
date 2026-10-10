import { callApi } from '../../../utils/apiCall'

export default defineEventHandler((event) => callApi(event, { method: 'GET', path: '/merchant/program' }))
