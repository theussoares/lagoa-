import { callApi } from '../../../../utils/apiCall'

export default defineEventHandler((event) => callApi(event, { method: 'POST', path: '/merchant/shop/poster-reprint/printed' }))
