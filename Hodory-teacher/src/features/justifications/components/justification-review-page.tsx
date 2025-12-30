'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IconAlertTriangle } from '@tabler/icons-react';

const student = {
  name: 'Lina R.',
  id: 'STU-1182',
  group: '3-CSE',
  module: 'Compilation',
  session: 'Oct 01 - 11:00',
  status: 'Pending-justification',
  type: 'Medical',
  notes: 'Visited clinic for severe flu. Certificate attached.'
};

export default function JustificationReviewPage() {
  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Justification review</CardTitle>
          <CardDescription>
            Review evidence and approve or reject the absence request.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Student &amp; absence info</CardTitle>
            <CardDescription>Context for this request.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>
                Student
              </p>
              <p className='text-sm font-medium'>
                {student.name} - {student.id}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Group</p>
              <p className='text-sm font-medium'>{student.group}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Module</p>
              <p className='text-sm font-medium'>{student.module}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Session</p>
              <p className='text-sm font-medium'>{student.session}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Status</p>
              <Badge variant='secondary'>{student.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impact</CardTitle>
            <CardDescription>Attendance totals for this student.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            <div className='flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm'>
              <span className='text-muted-foreground'>Unjustified</span>
              <span className='font-medium'>2</span>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm'>
              <span className='text-muted-foreground'>Justified</span>
              <span className='font-medium'>1</span>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm'>
              <span className='text-muted-foreground'>Exclusion status</span>
              <span className='font-medium text-amber-600'>Near threshold</span>
            </div>
            <p className='text-muted-foreground text-xs'>
              Approval will change this absence to justified.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Justification evidence</CardTitle>
          <CardDescription>Notes and attachments.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='grid gap-3'>
            <div className='rounded-lg border border-border/60 p-4'>
              <p className='text-xs uppercase text-muted-foreground'>Type</p>
              <p className='text-sm font-medium'>{student.type}</p>
              <p className='text-xs uppercase text-muted-foreground mt-3'>Notes</p>
              <p className='text-sm text-muted-foreground'>{student.notes}</p>
            </div>
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>Preview unavailable</AlertTitle>
              <AlertDescription>
                Attachment could not be opened. You may still approve or reject.
              </AlertDescription>
            </Alert>
          </div>
          <div className='flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground'>
            Attachment preview (PDF/image) will appear here.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>Take action or request more info.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='reject'>Rejection reason</Label>
            <Textarea
              id='reject'
              placeholder='Required if rejecting this request.'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='request'>Request more information</Label>
            <Textarea
              id='request'
              placeholder='Message to the student about missing information.'
            />
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button className='bg-emerald-600 text-white hover:bg-emerald-700'>
              Approve
            </Button>
            <Button variant='destructive'>Reject</Button>
            <Button variant='outline'>Request more info</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
