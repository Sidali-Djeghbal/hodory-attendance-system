'use client';

import * as React from 'react';
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
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import {
  getTeacherJustifications,
  validateJustification,
  type TeacherJustificationsResponse
} from '@/lib/teacher-api';
import { toast } from 'sonner';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function JustificationReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = React.useState<TeacherJustificationsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [teacherNotes, setTeacherNotes] = React.useState('');

  const justificationId = Number(searchParams.get('id') ?? '');

  React.useEffect(() => {
    if (!token || !Number.isFinite(justificationId)) return;
    let mounted = true;
    setIsLoading(true);
    getTeacherJustifications(token)
      .then((result) => {
        if (!mounted) return;
        setData(result);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load justification');
      })
      .finally(() => setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, [token, justificationId]);

  const entry = React.useMemo(() => {
    if (!data) return null;
    return data.justifications.find((j) => j.justification_id === justificationId) ?? null;
  }, [data, justificationId]);

  const studentName = entry?.student?.full_name ?? '—';
  const studentId = entry?.student?.student_id ? String(entry.student.student_id) : '—';
  const moduleLabel = entry?.module ? `${entry.module.code} - ${entry.module.name}` : '—';
  const sessionLabel = entry?.session?.date_time ? formatDateTime(entry.session.date_time) : '—';
  const statusLabel = entry?.status ?? '—';
  const notes = entry?.comment ?? '—';
  const fileUrl = entry?.file_url ?? null;

  const submitDecision = async (decision: 'approve' | 'reject') => {
    if (!token) return;
    if (!entry) return;
    if (decision === 'reject' && !teacherNotes.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await validateJustification(token, entry.justification_id, {
        decision,
        teacher_notes: teacherNotes.trim() ? teacherNotes.trim() : null
      });
      toast.success(`Justification ${decision}d.`);
      router.push('/dashboard/justifications');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                {studentName} - {studentId}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Group</p>
              <p className='text-sm font-medium'>—</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Module</p>
              <p className='text-sm font-medium'>{moduleLabel}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Session</p>
              <p className='text-sm font-medium'>{sessionLabel}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-xs uppercase'>Status</p>
              <Badge variant='secondary'>{statusLabel}</Badge>
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
              <p className='text-sm font-medium'>Justification</p>
              <p className='text-xs uppercase text-muted-foreground mt-3'>Notes</p>
              <p className='text-sm text-muted-foreground'>{notes}</p>
            </div>
            {fileUrl ? (
              <Alert>
                <IconAlertTriangle />
                <AlertTitle>Attachment</AlertTitle>
                <AlertDescription>
                  File URL present. Preview is not implemented in this UI yet.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <IconAlertTriangle />
                <AlertTitle>No attachment</AlertTitle>
                <AlertDescription>
                  This justification has no file attached.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className='flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground'>
            {fileUrl ? 'Attachment preview not implemented.' : 'No attachment.'}
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
              value={teacherNotes}
              onChange={(event) => setTeacherNotes(event.target.value)}
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
            <Button
              className='bg-emerald-600 text-white hover:bg-emerald-700'
              disabled={!entry || isLoading || isSubmitting}
              onClick={() => submitDecision('approve')}
            >
              {isSubmitting ? 'Working…' : 'Approve'}
            </Button>
            <Button
              variant='destructive'
              disabled={!entry || isLoading || isSubmitting}
              onClick={() => submitDecision('reject')}
            >
              Reject
            </Button>
            <Button variant='outline' disabled>
              Request more info
            </Button>
          </div>
          {!Number.isFinite(justificationId) ? (
            <p className='text-sm text-muted-foreground'>
              Missing or invalid justification ID.
            </p>
          ) : isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading…</p>
          ) : !entry ? (
            <p className='text-sm text-muted-foreground'>Justification not found.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
