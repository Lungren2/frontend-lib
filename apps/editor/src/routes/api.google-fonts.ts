import type { PaginatedFontsResponse } from "@/types/fonts";
import { FALLBACK_FONTS } from "@/utils/fonts";
import { fetchGoogleFonts } from "@/utils/fonts/google-fonts";
import { createFileRoute } from "@tanstack/react-router";

let cachedGoogleFonts: Awaited<ReturnType<typeof fetchGoogleFonts>> | undefined;

async function cachedFetchGoogleFonts(apiKey: string | undefined) {
  if (!cachedGoogleFonts) {
    cachedGoogleFonts = await fetchGoogleFonts(apiKey);
  }
  return cachedGoogleFonts;
}

async function getGoogleFonts(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const category = searchParams.get("category")?.toLowerCase();
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    let googleFonts = FALLBACK_FONTS;

    try {
      googleFonts = await cachedFetchGoogleFonts(process.env.GOOGLE_FONTS_API_KEY);
    } catch (error) {
      console.error("Error fetching Google Fonts:", error);
      console.log("Using fallback fonts");
    }

    // Filter fonts based on search query and category
    let filteredFonts = googleFonts;

    if (query) {
      filteredFonts = filteredFonts.filter((font) => font.family.toLowerCase().includes(query));
    }

    if (category && category !== "all") {
      filteredFonts = filteredFonts.filter((font) => font.category === category);
    }

    const paginatedFonts = filteredFonts.slice(offset, offset + limit);

    const response: PaginatedFontsResponse = {
      fonts: paginatedFonts,
      total: filteredFonts.length,
      offset,
      limit,
      hasMore: offset + limit < filteredFonts.length,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error in Google Fonts API:", error);
    return Response.json({ error: "Failed to fetch fonts" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/google-fonts")({
  server: {
    handlers: {
      GET: ({ request }) => getGoogleFonts(request),
    },
  },
});
