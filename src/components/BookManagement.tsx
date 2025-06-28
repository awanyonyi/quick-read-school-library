
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Book } from '../types';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BookManagementProps {
  onUpdate: () => void;
}

export const BookManagement: React.FC<BookManagementProps> = ({ onUpdate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    totalCopies: 1
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = () => {
    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    setBooks(booksData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.isbn || !formData.category) {
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
              availableCopies: book.availableCopies + (formData.totalCopies - book.totalCopies)
            }
          : book
      );
      localStorage.setItem('library_books', JSON.stringify(updatedBooks));
      toast({
        title: "Success",
        description: "Book updated successfully"
      });
    } else {
      // Add new book
      const newBook: Book = {
        id: Date.now().toString(),
        ...formData,
        availableCopies: formData.totalCopies,
        addedDate: new Date().toISOString()
      };
      booksData.push(newBook);
      localStorage.setItem('library_books', JSON.stringify(booksData));
      toast({
        title: "Success",
        description: "Book added successfully"
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
      isbn: '',
      category: '',
      totalCopies: 1
    });
    setEditingBook(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      totalCopies: book.totalCopies
    });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
          <p className="text-gray-600">Add, edit, and manage library books</p>
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
                {editingBook ? 'Update book information' : 'Add a new book to the library collection'}
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
                  <Label htmlFor="isbn">ISBN *</Label>
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                    placeholder="Enter ISBN"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Enter category"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Total Copies</Label>
                  <Input
                    id="copies"
                    type="number"
                    min="1"
                    value={formData.totalCopies}
                    onChange={(e) => setFormData({...formData, totalCopies: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBook ? 'Update Book' : 'Add Book'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Collection</CardTitle>
          <CardDescription>All books in the library system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {books.map((book) => (
              <div key={book.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{book.title}</h3>
                        <p className="text-gray-600">by {book.author}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant="secondary">{book.category}</Badge>
                          <span className="text-sm text-gray-500">ISBN: {book.isbn}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm">
                            Available: <span className="font-medium text-green-600">{book.availableCopies}</span>
                          </span>
                          <span className="text-sm">
                            Total: <span className="font-medium">{book.totalCopies}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(book)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(book.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
