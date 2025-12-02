// global.d.ts
interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        prompt: () => void;
      };
    };
  };
  FB?: any; // <-- thêm dòng này để TypeScript không báo lỗi
  fbAsyncInit: () => void;
}
