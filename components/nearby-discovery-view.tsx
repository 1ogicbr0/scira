/* eslint-disable @next/next/no-img-element */
import React, { useState, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import InteractiveMap from './interactive-maps';
import PlaceCard from './place-card';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { MapPin, Clock, Star, DollarSign, Phone, Globe, Navigation } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
}

interface Photo {
  photo_reference: string;
  width: number;
  height: number;
  url: string;
}

interface Place {
  place_id: string;
  name: string;
  category: string;
  category_icon: string;
  category_type: string;
  formatted_address: string;
  location: Location;
  distance: number;
  rating?: number;
  price_level?: string;
  is_open?: boolean;
  photos?: Photo[];
  phone?: string;
  website?: string;
  opening_hours?: string[];
  source: string;
}

interface CategoryData {
  category: string;
  category_icon: string;
  category_type: string;
  priority: number;
  places: Place[];
  count: number;
}

interface Insights {
  total_places_found: number;
  categories_with_results: number;
  average_distance: number;
  closest_place: Place | null;
  essential_services: CategoryData[];
  food_and_drink: CategoryData[];
  shopping_and_services: CategoryData[];
}

interface SearchSummary {
  query: string;
  radius_km: string;
  categories_searched: number;
  results_found: number;
}

interface NearbyDiscoveryViewProps {
  success: boolean;
  location: string;
  center: Location;
  radius: number;
  insights: Insights;
  categories: CategoryData[];
  all_places: Place[];
  search_summary: SearchSummary;
  error?: string;
}

const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${distance}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

const InsightCard = memo(({ title, value, icon: Icon, description }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) => (
  <Card className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border-neutral-200 dark:border-neutral-700">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm">
          <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
          {description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">{description}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
));

InsightCard.displayName = 'InsightCard';

const CategorySection = memo(({ categoryData, onPlaceClick }: {
  categoryData: CategoryData;
  onPlaceClick: (place: Place) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="text-2xl">{categoryData.category_icon}</span>
                <span>{categoryData.category}</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryData.count}
                </Badge>
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {categoryData.places.map((place) => (
                <div
                  key={place.place_id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                  onClick={() => onPlaceClick(place)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {place.name}
                        </h4>
                        {place.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-neutral-600 dark:text-neutral-400">{place.rating}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          <span>{formatDistance(place.distance)}</span>
                        </div>
                        {place.price_level && place.price_level !== 'Not Available' && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{place.price_level}</span>
                          </div>
                        )}
                        {place.is_open !== undefined && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className={place.is_open ? 'text-green-600' : 'text-red-600'}>
                              {place.is_open ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {place.formatted_address}
                      </p>
                    </div>
                    {place.photos && place.photos.length > 0 && (
                      <img
                        src={place.photos[0].url}
                        alt={place.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

CategorySection.displayName = 'CategorySection';

const NearbyDiscoveryView = memo<NearbyDiscoveryViewProps>(({
  success,
  location,
  center,
  radius,
  insights,
  categories,
  all_places,
  search_summary,
  error
}) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'map' | 'categories'>('overview');

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
    setViewMode('map');
  }, []);

  if (!success) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to discover nearby places</p>
          {error && <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Nearby Places Discovery
              </CardTitle>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Found {insights.total_places_found} places near {location}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overview')}
              >
                Overview
              </Button>
              <Button
                variant={viewMode === 'categories' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('categories')}
              >
                Categories
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                Map View
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Key Insights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightCard
              title="Total Places"
              value={insights.total_places_found}
              icon={MapPin}
              description={`in ${search_summary.radius_km}km radius`}
            />
            <InsightCard
              title="Categories"
              value={insights.categories_with_results}
              icon={Star}
              description="with results"
            />
            <InsightCard
              title="Avg Distance"
              value={formatDistance(insights.average_distance)}
              icon={Navigation}
              description="to places found"
            />
            <InsightCard
              title="Closest"
              value={insights.closest_place ? formatDistance(insights.closest_place.distance) : 'N/A'}
              icon={Clock}
              description={insights.closest_place?.name}
            />
          </div>

          {/* Quick Categories */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-red-500">🚨</span>
                  Essential Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.essential_services.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>{cat.category_icon}</span>
                        <span className="text-sm">{cat.category}</span>
                      </span>
                      <Badge variant="outline">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-orange-500">🍽️</span>
                  Food & Drink
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.food_and_drink.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>{cat.category_icon}</span>
                        <span className="text-sm">{cat.category}</span>
                      </span>
                      <Badge variant="outline">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-blue-500">🛒</span>
                  Shopping & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.shopping_and_services.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>{cat.category_icon}</span>
                        <span className="text-sm">{cat.category}</span>
                      </span>
                      <Badge variant="outline">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Categories Mode */}
      {viewMode === 'categories' && (
        <div className="space-y-4">
          {categories.map((categoryData) => (
            <CategorySection
              key={categoryData.category}
              categoryData={categoryData}
              onPlaceClick={handlePlaceClick}
            />
          ))}
        </div>
      )}

      {/* Map Mode */}
      {viewMode === 'map' && (
        <Card>
          <CardContent className="p-0">
            <div className="h-[600px] relative">
              <InteractiveMap
                center={center}
                places={all_places}
                selectedPlace={selectedPlace}
                onPlaceSelect={setSelectedPlace}
              />
              
              {/* Selected Place Overlay */}
              {selectedPlace && (
                <div className="absolute left-4 right-4 bottom-4 z-15 pointer-events-none">
                  <div className="pointer-events-auto">
                    <PlaceCard
                      place={selectedPlace}
                      onClick={() => {}}
                      isSelected={true}
                      variant="overlay"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

NearbyDiscoveryView.displayName = 'NearbyDiscoveryView';

export default NearbyDiscoveryView; 