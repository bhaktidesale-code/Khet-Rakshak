import { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AdminAccount,
  AppRole,
  PilotRoleRequest,
  decidePilotRoleRequest,
  getAdminAccounts,
  getPilotRoleRequests,
  updateAccountRole,
} from '../services/authService';

interface AdminAccessManagementProps {
  identity: User;
}

const roles: AppRole[] = ['FARMER', 'DRONE_PILOT', 'OUTLET_MANAGER', 'ADMIN'];

export default function AdminAccessManagement({ identity }: AdminAccessManagementProps) {
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [requests, setRequests] = useState<PilotRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const reportError = (cause: unknown, fallback: string) => {
    const message = cause instanceof Error ? cause.message : fallback;
    const denied = /forbidden|permission|administrator|403/i.test(message);
    setPermissionDenied(denied);
    setError(denied ? 'Your account does not have permission to manage these accounts.' : fallback);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setPermissionDenied(false);
    try {
      const [accountResult, requestResult] = await Promise.all([
        getAdminAccounts(identity),
        getPilotRoleRequests(identity),
      ]);
      setUsers(accountResult.users);
      setRequests(requestResult.requests);
    } catch (loadError) {
      reportError(loadError, 'We could not load this information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => { void refresh(); }, [refresh]);

  const decide = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setBusyUserId(requestId);
    setError('');
    try {
      await decidePilotRoleRequest(identity, requestId, status);
      await refresh();
      setNotice(status === 'APPROVED' ? 'Pilot access approved.' : 'Pilot request declined.');
    } catch (decisionError) {
      reportError(decisionError, 'We could not save that decision. Please try again.');
    } finally {
      setBusyUserId(null);
    }
  };

  const changeRole = async (userId: string, role: AppRole) => {
    setBusyUserId(userId);
    setError('');
    try {
      await updateAccountRole(identity, userId, role);
      await refresh();
      setNotice('Account role updated.');
    } catch (roleError) {
      reportError(roleError, 'We could not save the account role. Please try again.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <section className="mb-6 space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="font-display text-lg font-bold text-emerald-950 dark:text-white">Account access management</h2>
        <p className="text-xs text-gray-500">Only administrators with approved access can change account roles or pilot requests.</p>
      </div>
      {error && <div role="alert" className="space-y-3 rounded-xl border border-[#b42318] bg-red-50 p-3 text-base text-[#7a1b14]"><p>{permissionDenied ? 'Access restricted: ' : ''}{error}</p>{!permissionDenied && <button type="button" onClick={() => void refresh()} className="rounded-lg border border-[#7a1b14] px-4 font-semibold">Try again</button>}</div>}
      {notice && <p role="status" aria-live="polite" className="rounded-xl border border-[#176b3a] bg-green-50 p-3 text-base text-[#174c2c]">{notice}</p>}
      {loading ? <p role="status" className="text-sm text-gray-500">Loading account information…</p> : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-bold">Pending drone-pilot approval ({requests.length})</h3>
            {requests.length === 0 ? <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">No pending requests.</p> : (
              <div className="space-y-2">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div className="text-sm">
                      <p className="font-semibold">{request.full_name || 'Name not provided'}</p>
                      <p className="text-xs text-gray-500">{request.village} · {request.email || request.mobile_number || 'No contact detail'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busyUserId !== null} onClick={() => void decide(request.id, 'REJECTED')} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Reject</button>
                      <button disabled={busyUserId !== null} onClick={() => void decide(request.id, 'APPROVED')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve pilot</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold">Application accounts</h3>
            {users.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-base text-[#465449] dark:bg-gray-800 dark:text-gray-200">No accounts to show.</p> : <>
            <div className="space-y-3 md:hidden">
              {users.map((account) => (
                <article key={account.id} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <div><p className="font-semibold">{account.full_name || 'Name not provided'}</p><p className="break-all text-sm text-gray-600">{account.email || account.mobile_number}</p><p className="text-sm">Village: {account.village || 'Not provided'}</p><p className="text-sm">Status: {account.account_status}</p></div>
                  <label className="block text-sm font-semibold">Account role
                    <select aria-label={`Role for ${account.full_name || account.id}`} value={account.role} disabled={busyUserId !== null} onChange={(event) => {
                      const selectedRole = roles.find((role) => role === event.target.value);
                      if (selectedRole) void changeRole(account.id, selectedRole);
                    }} className="mt-1 w-full rounded-lg border bg-transparent p-2 dark:border-gray-700">
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead><tr className="border-b text-gray-500"><th className="p-2">Account</th><th className="p-2">Village</th><th className="p-2">Role</th><th className="p-2">Status</th></tr></thead>
                <tbody>{users.map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="p-2"><span className="font-semibold">{account.full_name || 'Name not provided'}</span><span className="block text-gray-500">{account.email || account.mobile_number}</span></td>
                    <td className="p-2">{account.village || '—'}</td>
                    <td className="p-2">
                      <select
                        aria-label={`Role for ${account.full_name || account.id}`}
                        value={account.role}
                        disabled={busyUserId !== null}
                        onChange={(event) => {
                          const selectedRole = roles.find((role) => role === event.target.value);
                          if (selectedRole) void changeRole(account.id, selectedRole);
                        }}
                        className="rounded-lg border bg-transparent p-2 dark:border-gray-700"
                      >
                        {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="p-2">{account.account_status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            </>}
          </div>
        </>
      )}
    </section>
  );
}
