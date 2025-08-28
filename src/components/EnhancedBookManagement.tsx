import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Edit, Trash2, Book, Clock } from 'lucide-react';
import { Book as BookType } from '@/types';
import { fetchBooks, addBook } from '@/utils/libraryData';
import { useToast } from '@/hooks/use-toast';

interface EnhancedBookManagementProps {
  onUpdate: () => void;
}

const categories = [
  'Science',
  'Language',
  'Technicals and Applied',
  'Humanities',
  'Maths'
];

const periodUnits = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' }
];

// Generate unique ISBN for each copy
const generateUniqueISBN = (existingBooks: BookType[]): string => {
  const existingISBNs = new Set(existingBooks.map(book => book.isbn).filter(Boolean));
  let isbn: string;
  
  do {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    isbn = `978${timestamp.slice(-6)}${random}`;
  } while (existingISBNs.has(isbn));
  
  return isbn;
};

export default function EnhancedBookManagement({ onUpdate }: EnhancedBookManagementProps) {
  const [books, setBooks] = useState<BookType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [isbnMode, setIsbnMode] = useState<'auto' | 'manual'>('auto');
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    total_copies: 1,
    isbn: '',
    due_period_value: 24,
    due_period_unit: 'hours'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (error) {
      console.error('Error loading books:', error);
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingBook) {
        // Handle editing existing book
        toast({
          title: "Info",
          description: "Editing existing books will be implemented in the next update",
        });
      } else {
        // Handle adding new books
        const totalCopies = parseInt(formData.total_copies.toString());
        
        for (let i = 0; i < totalCopies; i++) {
          const isbn = isbnMode === 'manual' && formData.isbn ? 
            `${formData.isbn}-${i + 1}` : 
            generateUniqueISBN(books);
          
          await addBook({
            title: formData.title,
            author: formData.author,
            isbn,
            category: formData.category,
            total_copies: 1, // Each record represents one copy
            due_period_value: formData.due_period_value,
            due_period_unit: formData.due_period_unit
          });
        }

        toast({
          title: "Success",
          description: `Added ${totalCopies} ${totalCopies === 1 ? 'copy' : 'copies'} of "${formData.title}"`,
        });
      }

      loadBooks();
      onUpdate();
      resetForm();
    } catch (error) {
      console.error('Error saving book:', error);
      toast({
        title: "Error",
        description: "Failed to save book",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      category: '',
      total_copies: 1,
      isbn: '',
      due_period_value: 24,
      due_period_unit: 'hours'
    });
    setEditingBook(null);
    setIsAddDialogOpen(false);
    setIsbnMode('auto');
  };

  // Group books by title and author for display
  const groupedBooks = books.reduce((groups, book) => {
    const key = `${book.title}-${book.author}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(book);
    return groups;
  }, {} as Record<string, BookType[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Book Management</h2>
          <p className="text-gray-600">Add books with flexible due periods and ISBN options</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
              <DialogDescription>
                Configure book details, due periods, and ISBN generation options
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter book title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Enter author name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                    onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>ISBN Generation Method</Label>
                  <RadioGroup 
                    value={isbnMode} 
                    onValueChange={(value: 'auto' | 'manual') => setIsbnMode(value)}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="auto" id="auto" />
                      <Label htmlFor="auto">Auto-generate unique ISBNs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="manual" />
                      <Label htmlFor="manual">Enter base ISBN manually</Label>
                    </div>
                  </RadioGroup>

                  {isbnMode === 'manual' && (
                    <div className="space-y-2">
                      <Label htmlFor="isbn">Base ISBN</Label>
                      <Input
                        id="isbn"
                        value={formData.isbn}
                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                        placeholder="Enter base ISBN (copy numbers will be appended)"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Borrowing Due Period</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="1"
                        value={formData.due_period_value}
                        onChange={(e) => setFormData({ ...formData, due_period_value: parseInt(e.target.value) || 1 })}
                        placeholder="Period value"
                      />
                    </div>
                    <div className="flex-1">
                      <Select 
                        value={formData.due_period_unit} 
                        onValueChange={(value) => setFormData({ ...formData, due_period_unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {periodUnits.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Books will be due after {formData.due_period_value} {formData.due_period_unit}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBook ? 'Update Book' : 'Add Book'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(groupedBooks).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Book className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Books Found</h3>
            <p className="text-gray-600 text-center mb-4">
              Start building your library by adding your first book with custom due periods.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(groupedBooks).map(([key, bookCopies]) => {
            const firstBook = bookCopies[0];
            const availableCopies = bookCopies.filter(book => book.available_copies > 0).length;
            
            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{firstBook.title}</CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        by {firstBook.author} • {firstBook.category}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Due after {firstBook.due_period_value || 24} {firstBook.due_period_unit || 'hours'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={availableCopies > 0 ? "default" : "destructive"}>
                        {availableCopies}/{bookCopies.length} Available
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Individual Copies:</Label>
                    <div className="grid gap-2">
                      {bookCopies.map((book) => (
                        <div
                          key={book.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium">ISBN: {book.isbn}</span>
                            <Badge 
                              variant={book.available_copies > 0 ? "secondary" : "outline"}
                              className="ml-2"
                            >
                              {book.available_copies > 0 ? 'Available' : 'Borrowed'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}