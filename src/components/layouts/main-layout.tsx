import { Stack } from "@mui/material";
import Leftmenu from "../leftmenu/leftmenu";
export function MainLayout({ children }: { children: React.ReactNode }) {

    return (
        <Stack sx={{ position: "relative" }} className="safe-bottom h-svh">
            <Stack
                sx={{
                    // backgroundColor: "gray",
                    width: "100vw",
                    overflowX: "hidden",
                    padding: "0px",
                    height: "100svh",
                    ".MuiSkeleton-root": {
                        transform: "unset",
                    },
                    backgroundColor: "#FFF",
                    // gap:'24px'
                }}
                direction={"row"}
            >
                <Leftmenu />
                <div
                    className={`flex-1 overflow-hidden`}
                >
                    <Stack
                        sx={{
                            backgroundColor: "#FFF",
                            overflow: "hidden",
                            height: "100%",
                            flex: 1,
                            // padding: "16px",
                        }}
                        className="shadow-[0px_1px_10px_0px_#2222221A]"
                    >
                        {children}
                    </Stack>
                </div>
            </Stack>
        </Stack>
    );
}
