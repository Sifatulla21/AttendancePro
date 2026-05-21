"use client"

import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClassSelectorProps {
  showAddButton?: boolean;
}

export function ClassSelector({ showAddButton = true }: ClassSelectorProps) {
  const { classes, selectedClassId, setSelectedClassId, addClass } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const handleAddClass = () => {
    if (newClassName.trim()) {
      addClass(newClassName.trim());
      setNewClassName('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 px-6">
      <h2 className="text-lg font-headline text-muted-foreground uppercase tracking-wider">Select Class</h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={cn(
              "flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-medium transition-all",
              selectedClassId === cls.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {showAddButton && (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Class</span>
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Class Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Science I"
              className="bg-muted border-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass}>Add Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
