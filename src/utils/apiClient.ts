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

  async updateStudent(studentId: string, studentData: any): Promise<any> {
    return this.request(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(studentId: string): Promise<any> {
    return this.request(`/students/${studentId}`, {
      method: 'DELETE',
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

  // Process overdue books and update blacklist
  async processOverdueBooks(): Promise<any> {
    return this.request('/process-overdue', {
      method: 'POST',
    });
  }

  // Biometric enrollment
  async updateBiometricData(studentId: string, biometricData: any): Promise<any> {
    return this.request(`/students/${studentId}/biometric`, {
      method: 'PUT',
      body: JSON.stringify(biometricData),
    });
  }

  // Get all enrolled biometric data for duplicate checking
  async getBiometricData(): Promise<any[]> {
    return this.request('/students/biometric-data');
  }

  // Log biometric verification event
  async logBiometricVerification(verificationData: any): Promise<any> {
    return this.request('/biometric-verification', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  // Get biometric verification logs
  async getBiometricVerificationLogs(params?: {
    student_id?: string;
    book_id?: string;
    verification_type?: string;
    limit?: number;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.student_id) queryParams.append('student_id', params.student_id);
    if (params?.book_id) queryParams.append('book_id', params.book_id);
    if (params?.verification_type) queryParams.append('verification_type', params.verification_type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/biometric-verification?${queryString}` : '/biometric-verification';

    return this.request(endpoint);
  }

  // Admin authentication methods
  async adminLogin(credentials: { username: string; password: string }): Promise<any> {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async adminLogout(): Promise<any> {
    return this.request('/admin/logout', {
      method: 'POST',
    });
  }

  async verifyAdminSession(): Promise<any> {
    return this.request('/admin/verify');
  }

  async getAdminProfile(): Promise<any> {
    return this.request('/admin/profile');
  }

  async changeAdminPassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<any> {
    return this.request('/admin/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);