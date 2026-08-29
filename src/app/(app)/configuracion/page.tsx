import { Building2, Hospital, Plus, ShieldCheck, Trash2, Users } from "lucide-react";

import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABELS, requireSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/calc";
import { listCompanies, listHospitals, listUsers } from "@/lib/data";
import {
  deleteCompany,
  deleteHospital,
  deleteUser,
  toggleCompany,
  toggleHospital,
  toggleUser,
} from "@/app/(app)/configuracion/actions";
import { CompanyDialog } from "@/app/(app)/configuracion/company-dialog";
import { HospitalDialog } from "@/app/(app)/configuracion/hospital-dialog";
import { UserDialog } from "@/app/(app)/configuracion/user-dialog";

export const dynamic = "force-dynamic";

const PERIOD_LABELS = {
  weekly: "Semanal",
  biweekly: "Quincenal",
} as const;

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

export default async function ConfiguracionPage() {
  const session = await requireSession();
  const isAdmin = session.role === "admin";

  const [companies, hospitals, users] = await Promise.all([
    listCompanies(),
    listHospitals(),
    listUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Empresas, hospitales con su precio vigente y usuarios del sistema.
        </p>
      </div>

      {!isAdmin ? (
        <p className="flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Tu cuenta es de capturista: puedes consultar la configuración y dar de alta
          registros, pero editar y eliminar está reservado a los administradores.
        </p>
      ) : null}

      <Tabs defaultValue="empresas">
        <TabsList>
          <TabsTrigger value="empresas">
            <Building2 className="size-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="hospitales">
            <Hospital className="size-4" />
            Hospitales
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="size-4" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Empresas</CardTitle>
                <CardDescription>
                  La periodicidad define el periodo de los reportes por empresa.
                </CardDescription>
              </div>
              <CompanyDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    Nueva empresa
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Periodicidad</TableHead>
                      <TableHead>Hospitales</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          Todavía no hay empresas registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>
                            {PERIOD_LABELS[company.paymentPeriodType]}
                          </TableCell>
                          <TableCell>
                            {
                              hospitals.filter((h) => h.companyId === company.id).length
                            }
                          </TableCell>
                          <TableCell>
                            <ActiveBadge active={company.active} />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {isAdmin ? (
                                <>
                                  <CompanyDialog
                                    company={company}
                                    trigger={
                                      <Button variant="outline" size="sm">
                                        Editar
                                      </Button>
                                    }
                                  />
                                  <ActionButton
                                    action={toggleCompany}
                                    values={{ id: company.id }}
                                  >
                                    {company.active ? "Desactivar" : "Activar"}
                                  </ActionButton>
                                  <ActionButton
                                    action={deleteCompany}
                                    values={{ id: company.id }}
                                    className="text-destructive hover:text-destructive"
                                    confirmTitle={`¿Eliminar ${company.name}?`}
                                    confirmDescription="La empresa se borra definitivamente. Solo es posible si ya no tiene hospitales registrados."
                                    confirmLabel="Eliminar"
                                  >
                                    <Trash2 className="size-4" />
                                    Eliminar
                                  </ActionButton>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Solo administradores
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hospitales">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Hospitales</CardTitle>
                <CardDescription>
                  Cada hospital pertenece a una empresa, está en un estado de la
                  República y tiene su propio precio.
                </CardDescription>
              </div>
              <HospitalDialog
                companies={companies}
                trigger={
                  <Button size="sm" disabled={companies.length === 0}>
                    <Plus className="size-4" />
                    Nuevo hospital
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Precio actual</TableHead>
                      <TableHead>Situación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospitals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Todavía no hay hospitales registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      hospitals.map((hospital) => (
                        <TableRow key={hospital.id}>
                          <TableCell className="font-medium">{hospital.name}</TableCell>
                          <TableCell>{hospital.companyName}</TableCell>
                          <TableCell>{hospital.state}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(hospital.price)}
                          </TableCell>
                          <TableCell>
                            <ActiveBadge active={hospital.active} />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {isAdmin ? (
                                <>
                                  <HospitalDialog
                                    hospital={hospital}
                                    companies={companies}
                                    trigger={
                                      <Button variant="outline" size="sm">
                                        Editar
                                      </Button>
                                    }
                                  />
                                  <ActionButton
                                    action={toggleHospital}
                                    values={{ id: hospital.id }}
                                  >
                                    {hospital.active ? "Desactivar" : "Activar"}
                                  </ActionButton>
                                  <ActionButton
                                    action={deleteHospital}
                                    values={{ id: hospital.id }}
                                    className="text-destructive hover:text-destructive"
                                    confirmTitle={`¿Eliminar ${hospital.name}?`}
                                    confirmDescription="El hospital se borra definitivamente. Solo es posible si no tiene capturas en su historial."
                                    confirmLabel="Eliminar"
                                  >
                                    <Trash2 className="size-4" />
                                    Eliminar
                                  </ActionButton>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Solo administradores
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Usuarios</CardTitle>
                <CardDescription>
                  Las contraseñas se guardan cifradas con bcrypt.
                </CardDescription>
              </div>
              <UserDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    Nuevo usuario
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                          {user.id === session.id ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (tú)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "outline"}
                          >
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={user.active} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {isAdmin ? (
                              <>
                                <UserDialog
                                  user={user}
                                  trigger={
                                    <Button variant="outline" size="sm">
                                      Editar
                                    </Button>
                                  }
                                />
                                <ActionButton
                                  action={toggleUser}
                                  values={{ id: user.id }}
                                  disabled={user.id === session.id}
                                >
                                  {user.active ? "Desactivar" : "Activar"}
                                </ActionButton>
                                <ActionButton
                                  action={deleteUser}
                                  values={{ id: user.id }}
                                  disabled={user.id === session.id}
                                  className="text-destructive hover:text-destructive"
                                  confirmTitle={`¿Eliminar a ${user.name}?`}
                                  confirmDescription="El usuario se borra definitivamente y perderá el acceso al sistema."
                                  confirmLabel="Eliminar"
                                >
                                  <Trash2 className="size-4" />
                                  Eliminar
                                </ActionButton>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Solo administradores
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
