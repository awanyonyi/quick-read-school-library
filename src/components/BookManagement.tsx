
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Book } from '../types';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BookManagementProps {
  onUpdate: () => void;
}

// Generate unique ISBN
const generateUniqueISBN = (existingBooks: Book[]): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  let isbn = `978${timestamp.slice(-6)}${random}`;
  
  // Ensure uniqueness
  while (existingBooks.some(book => book.isbn === isbn)) {
    const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    isbn = `978${timestamp.slice(-6)}${newRandom}`;
  }
  
  return isbn;
};

export const BookManagement: React.FC<BookManagementProps> = ({ onUpdate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '' as Book['category'] | '',
    total_copies: 1
  });

  const categories = ['Science', 'Language', 'Technicals and Applied', 'Humanities', 'Maths'] as const;

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = () => {
    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    setBooks(booksData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    
    if (editingBook) {
      // Update existing book
      const updatedBooks = booksData.map((book: Book) => 
        book.id === editingBook.id 
          ? {
              ...book,
              ...formData,
              available_copies: book.available_copies + (formData.total_copies - book.total_copies)
            }
          : book
      );
      localStorage.setItem('library_books', JSON.stringify(updatedBooks));
      toast({
        title: "Success",
        description: "Book updated successfully"
      });
    } else {
      // Add new books - create individual entries for each copy
      const newBooks: Book[] = [];
      
      for (let i = 0; i < formData.total_copies; i++) {
        const uniqueISBN = generateUniqueISBN([...booksData, ...newBooks]);
        const newBook: Book = {
          id: `${Date.now()}_${i}`,
          title: formData.title,
          author: formData.author,
          isbn: uniqueISBN,
          category: formData.category as Book['category'],
          total_copies: 1, // Each book is now a single copy with unique ISBN
          available_copies: 1,
          created_at: new Date().toISOString()
        };
        newBooks.push(newBook);
      }
      
      const updatedBooksData = [...booksData, ...newBooks];
      localStorage.setItem('library_books', JSON.stringify(updatedBooksData));
      
      toast({
        title: "Success",
        description: `${formData.total_copies} book${formData.total_copies > 1 ? 's' : ''} added successfully with unique ISBNs`
      });
    }
    
    resetForm();
    loadBooks();
    onUpdate();
  };

  const handleDelete = (bookId: string) => {
    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    const updatedBooks = booksData.filter((book: Book) => book.id !== bookId);
    localStorage.setItem('library_books', JSON.stringify(updatedBooks));
    
    toast({
      title: "Success",
      description: "Book deleted successfully"
    });
    
    loadBooks();
    onUpdate();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      category: '',
      total_copies: 1
    });
    setEditingBook(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      total_copies: book.total_copies
    });
    setIsAddDialogOpen(true);
  };

  // Group books by title and author for display
  const groupedBooks = books.reduce((groups, book) => {
    const key = `${book.title}-${book.author}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(book);
    return groups;
  }, {} as Record<string, Book[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
          <p className="text-gray-600">Add, edit, and manage library books - each copy gets a unique ISBN</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
              <DialogDescription>
                {editingBook ? 'Update book information' : 'Add new books to the library collection. Each copy will get a unique ISBN.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter book title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    placeholder="Enter author name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value: Book['category']) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Number of Copies</Label>
                  <Input
                    id="copies"
                    type="number"
                    min="1"
                    value={formData.total_copies}
                    onChange={(e) => setFormData({...formData, total_copies: parseInt(e.target.value)})}
                    required
                  />
                  <p className="text-xs text-gray-500">Each copy will get a unique ISBN</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBook ? 'Update Book' : 'Add Books'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Collection</CardTitle>
          <CardDescription>All books in the library system (grouped by title)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedBooks).map(([key, bookGroup]) => {
              const firstBook = bookGroup[0];
              const totalCopies = bookGroup.length;
              const availableCopies = bookGroup.filter(book => book.available_copies > 0).length;
              
              return (
                <div key={key} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{firstBook.title}</h3>
                          <p className="text-gray-600">by {firstBook.author}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="secondary">{firstBook.category}</Badge>
                            <span className="text-sm">
                              Available: <span className="font-medium text-green-600">{availableCopies}</span>
                            </span>
                            <span className="text-sm">
                              Total Copies: <span className="font-medium">{totalCopies}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual book copies with their unique ISBNs */}
                  <div className="space-y-2 mt-4 pl-12">
                    <h4 className="font-medium text-sm text-gray-700">Individual Copies:</h4>
                    <div className="grid gap-2">
                      {bookGroup.map((book) => (
                        <div key={book.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="text-sm font-mono">ISBN: {book.isbn}</span>
                            <span className={`ml-4 text-xs px-2 py-1 rounded ${
                              book.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {book.available_copies > 0 ? 'Available' : 'Borrowed'}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(book)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(book.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {books.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No books in the library yet</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Book
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
