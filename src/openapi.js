import { OpenAPI } from './client';

OpenAPI.BASE = import.meta.env.VITE_BACKEND_ORIGIN;
// OpenAPI.BASE = 'http://localhost:800';

export default OpenAPI;
