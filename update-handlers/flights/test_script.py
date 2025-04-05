#!/usr/bin/env python3
"""
Test script to run the flight data collector locally.
"""
import os
import sys
import json
import argparse
from flight_data_collector import FlightDataCollector
import logging


def parse_args():
    parser = argparse.ArgumentParser(
        description='Flight Data Collector Test Script')
    parser.add_argument('--api-key', '-k', dest='api_key',
                        help='FlightAware API Key')
    parser.add_argument('--output', '-o', dest='output_file',
                        default='flight_data.json', help='Output file name')
    parser.add_argument('--save-only', '-s', action='store_true',
                        help='Only save to file, do not upload to S3')
    parser.add_argument('--bucket', '-b', dest='bucket_name',
                        default='is120-w25-apis', help='S3 bucket name')
    parser.add_argument('--key', dest='object_key',
                        default='data/flights-api/data.json', help='S3 object key')
    parser.add_argument('--debug', '-d', action='store_true',
                        help='Enable debug logging')
    parser.add_argument('--synthetic-only', action='store_true',
                        help='Use only synthetic data, no API calls')
    return parser.parse_args()


def main():
    args = parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

    # Get API key from arguments or environment variable
    api_key = args.api_key or os.environ.get('FLIGHTAWARE_API_KEY')
    if not api_key and not args.synthetic_only:
        logger.error(
            "API key is required for API access. Provide it as an argument or set the FLIGHTAWARE_API_KEY environment variable.")
        logger.error(
            "Alternatively, use --synthetic-only to generate data without API access.")
        sys.exit(1)

    try:
        # Initialize the collector
        collector = FlightDataCollector(api_key=api_key)

        # Collect flight data
        logger.info("Collecting flight data...")
        flight_data = collector.collect_data()

        # Save to file
        output_file = args.output_file
        logger.info(f"Saving data to {output_file}...")
        collector.save_to_json(flight_data, output_file)

        # Upload to S3 if requested
        if not args.save_only:
            logger.info(f"Uploading data to S3 bucket {args.bucket_name}...")
            uploaded = collector.upload_to_s3(
                flight_data, args.bucket_name, args.object_key)
            if uploaded:
                logger.info("Upload successful!")
            else:
                logger.error("Upload failed.")

        # Print summary
        print("\nData Collection Summary:")
        print(f"Collection Date: {flight_data['collection_date']}")
        print(f"Airlines: {len(flight_data['airlines'])}")
        print(f"Airports: {len(flight_data['airports'])}")
        print(f"Popular Routes: {len(flight_data['popular_routes'])}")
        print("\nSample Data:")
        if flight_data['airlines']:
            airline = flight_data['airlines'][0]
            print(f"  Airline: {airline['name']} ({airline['airline_id']})")
            print(f"  Routes: {len(airline['routes'])}")
            if airline['routes']:
                route = airline['routes'][0]
                print(
                    f"    Sample Route: {route['origin']} to {route['destination']} ({route['distance_miles']} miles)")
                print(
                    f"    Most Recent Flight: {route['most_recent_flight']['flight_number']} at {route['most_recent_flight']['departure']}")
                print(
                    f"    Next Flight: {route['next_flight']['flight_number']} at {route['next_flight']['departure']}")

        logger.info("Done!")

    except Exception as e:
        logger.error(f"Error in main: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
