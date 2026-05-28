import axios, {
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";

const backendClient = axios.create({
    baseURL: "/api/backend/",
    withCredentials: true, // tự gửi cookie
});

backendClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Ví dụ:
        // config.headers.Authorization = `Bearer ${token}`;

        return config;
    },
    (err: AxiosError) => {
        return Promise.reject(err);
    }
);

backendClient.interceptors.response.use(
    async (response: AxiosResponse) => {
        return response;
    },
    async (err: AxiosError) => {
        // Handle lỗi global ở đây

        if (err.response?.status === 401) {
            console.log("Unauthorized");
            // redirect login / refresh token
        }

        return Promise.reject(err);
    }
);

export default backendClient;