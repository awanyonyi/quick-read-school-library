// API client for communicating with the backend API server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to API server at ${url}. ` +
          `Please start the API server with: npm run api`
        );
      }
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Books API
  async getBooks(): Promise<any[]> {
    return this.request('/books');
  }

  async addBook(bookData: any): Promise<any> {
    return this.request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
  }

  // Students API
  async getStudents(): Promise<any[]> {
    return this.request('/students');
  }

  async addStudent(studentData: any): Promise<any> {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  // Borrowing API
  async getBorrowRecords(): Promise<any[]> {
    return this.request('/borrowing');
  }

  async createBorrowRecord(recordData: any): Promise<any> {
    return this.request('/borrowing', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  async returnBook(recordId: string): Promise<any> {
    return this.request(`/borrowing/${recordId}/return`, {
      method: 'PUT',
    });
  }

  // Biometric enrollment
  async updateBiometricData(studentId: string, biometricData: any): Promise<any> {
    return this.request(`/students/${studentId}/biometric`, {
      method: 'PUT',
      body: JSON.stringify(biometricData),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);