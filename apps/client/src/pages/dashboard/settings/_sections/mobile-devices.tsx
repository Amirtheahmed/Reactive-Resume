// apps/client/src/pages/dashboard/settings/_sections/mobile-devices.tsx
import { t, Trans } from "@lingui/macro";
import { DeviceMobileIcon, TrashSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@reactive-resume/ui";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState } from "react";

import { useToast } from "@/client/hooks/use-toast";
import {
  useDeleteMobileDevice,
  useMobileDevices,
  useRevokeAllMobileLinks,
} from "@/client/services/mobile-link";

dayjs.extend(relativeTime);

export const MobileDevicesSettings = () => {
  const { toast } = useToast();
  const { devices, isLinked, loading } = useMobileDevices();
  const { deleteDevice, loading: deleteLoading } = useDeleteMobileDevice();
  const { revokeAll, loading: revokeLoading } = useRevokeAllMobileLinks();
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  const onDelete = async (id: string, deviceName?: string | null) => {
    await deleteDevice(id);
    toast({
      variant: "success",
      title: t`Device unlinked`,
      description: deviceName ? deviceName + t` has been unlinked from your account.` : t`Device has been unlinked from your account.`,
    });
  };

  const onRevokeAll = async () => {
    await revokeAll();
    setRevokeAllOpen(false);
    toast({
      variant: "success",
      title: t`All devices unlinked`,
      description: t`All mobile devices have been unlinked from your account.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold leading-relaxed tracking-tight">{t`Mobile Devices`}</h3>
        <p className="leading-relaxed opacity-75">
          {t`Manage mobile devices linked to your Reactive Resume account.`}
        </p>
      </div>

      {!loading && !isLinked && (
        <Alert>
          <DeviceMobileIcon className="h-4 w-4" />
          <AlertDescription>
            <Trans>
              No mobile devices are currently linked to your account. Use our mobile app to link your device and generate resumes on the go.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {(loading || isLinked) && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t`Device`}</TableHead>
                <TableHead>{t`Provider`}</TableHead>
                <TableHead>{t`Linked`}</TableHead>
                <TableHead>{t`Last Used`}</TableHead>
                <TableHead className="text-right">{t`Actions`}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell className="text-center opacity-50" colSpan={5}>
                    {t`Loading...`}
                  </TableCell>
                </TableRow>
              )}
              {!loading && devices.length === 0 && (
                <TableRow>
                  <TableCell className="text-center opacity-50" colSpan={5}>
                    {t`No devices found.`}
                  </TableCell>
                </TableRow>
              )}
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <DeviceMobileIcon className="h-4 w-4 text-muted-foreground" />
                      {device.deviceName ?? t`Unknown Device`}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{device.provider}</TableCell>
                  {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                  <TableCell>{dayjs(device.createdAt).format("MMM D, YYYY")}</TableCell>
                  <TableCell>
                    {device.lastUsed ? dayjs(device.lastUsed).fromNow() : t`Never`}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <Tooltip content={t`Unlink Device`}>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="text-error"
                            disabled={deleteLoading}
                            size="icon"
                            variant="ghost"
                          >
                            <TrashSimpleIcon />
                          </Button>
                        </AlertDialogTrigger>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t`Unlink Device`}</AlertDialogTitle>
                          <AlertDialogDescription>
                            <Trans>
                              Are you sure you want to unlink
                            </Trans>
                            {device.deviceName ?? t` Unknown Device`}?
                            <Trans>
                              The mobile app will no longer be able to access your account from this device.
                            </Trans>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-error text-error-foreground hover:bg-error/90"
                            onClick={() => onDelete(device.id, device.deviceName)}
                          >
                            {t`Unlink`}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isLinked && devices.length > 1 && (
        <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <WarningIcon className="mr-2" />
              {t`Unlink All Devices`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t`Unlink All Devices`}</AlertDialogTitle>
              <AlertDialogDescription>
                <Trans>
                  Are you sure you want to unlink all mobile devices? All </Trans> {devices.length} <Trans> devices will be disconnected and will need to re-authorize to access your account.
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-error text-error-foreground hover:bg-error/90"
                disabled={revokeLoading}
                onClick={onRevokeAll}
              >
                {revokeLoading ? t`Unlinking...` : t`Unlink All`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

