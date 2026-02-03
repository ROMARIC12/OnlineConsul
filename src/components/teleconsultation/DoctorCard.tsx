import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Lock, Banknote } from "lucide-react";

interface DoctorCardProps {
    doctor: {
        id: string;
        first_name: string;
        last_name: string;
        specialty: string;
        photo_url: string | null;
        is_online: boolean | null;
        is_teleconsultation_free: boolean | null;
        teleconsultation_price_per_minute: number | null;
    };
    onStart: (doctorId: string) => void;
    onPay: (doctor: any) => void;
    onEnterCode: (doctorId: string) => void;
}

export function DoctorCard({ doctor, onStart, onPay, onEnterCode }: DoctorCardProps) {
    const isOnline = doctor.is_online;
    const isFree = doctor.is_teleconsultation_free;

    return (
        <Card className="w-full hover:shadow-lg transition-all duration-300 overflow-hidden border-t-4 border-t-primary/80">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={doctor.photo_url || ""} alt={`${doctor.first_name} ${doctor.last_name}`} />
                        <AvatarFallback>{doctor.first_name[0]}{doctor.last_name[0]}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-lg leading-none truncate">Dr. {doctor.first_name} {doctor.last_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{doctor.specialty}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? "bg-green-500 hover:bg-green-600" : ""}>
                            {isOnline ? "En ligne" : "Hors ligne"}
                        </Badge>
                        {isFree && <Badge variant="outline" className="text-green-600 border-green-600">Gratuit</Badge>}
                        {!isFree && <Badge variant="outline">{doctor.teleconsultation_price_per_minute || 0} FCFA/min</Badge>}
                    </div>
                </div>
            </CardHeader>

            <CardFooter className="flex flex-col gap-2 pt-2 bg-slate-50/50">
                {isOnline ? (
                    isFree ? (
                        <Button className="w-full gap-2" onClick={() => onStart(doctor.id)}>
                            <Video className="h-4 w-4" />
                            Démarrer la consultation
                        </Button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            <Button variant="outline" className="w-full gap-2" onClick={() => onEnterCode(doctor.id)}>
                                <Lock className="h-4 w-4" />
                                J'ai un code
                            </Button>
                            <Button className="w-full gap-2" onClick={() => onPay(doctor)}>
                                <Banknote className="h-4 w-4" />
                                Payer
                            </Button>
                        </div>
                    )
                ) : (
                    <Button variant="secondary" className="w-full" disabled>
                        Médecin indisponible
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
