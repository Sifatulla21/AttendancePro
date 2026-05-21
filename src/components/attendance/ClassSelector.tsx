
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-headline text-muted-foreground uppercase tracking-widest italic font-bold">Academic Registry</h2>
        {showAddButton && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 space-x-3 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" />
            <span className="text-lg font-headline">New Class</span>
          </Button>
        )}
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={cn(
              "flex-shrink-0 px-8 py-4 rounded-2xl text-lg font-headline transition-all border-2",
              selectedClassId === cls.id
                ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-105"
                : "bg-card text-muted-foreground border-transparent hover:border-primary/30 hover:bg-muted"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Establish New Class</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Science Batch A"
              className="bg-muted border-none rounded-2xl h-16 text-xl font-headline"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl h-14 text-lg font-headline">Cancel</Button>
            <Button onClick={handleAddClass} className="bg-primary rounded-xl h-14 px-8 text-lg font-headline">Create Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
