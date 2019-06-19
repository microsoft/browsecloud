# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import datetime
import time


class PipelineTimer():
    def __init__(self):
        self.last_s = time.time()
        self.init_time = self.last_s

    def __call__(self, description):
        curr_s = time.time()
        self.printSectionDescription(description)
        self.printCurrentTime()
        self.printPrettyTime(curr_s - self.last_s)
        self.last_s = curr_s
        if description == "Done.":
            self.prettyPrintTotal(curr_s - self.init_time)

    def printSectionDescription(self, description):
        print(description)

    def prettyPrintHelper(self, s: float):
        hours = s // 3600
        s -= (hours * 3600)
        minutes = s//60
        s -= (minutes * 60)
        seconds = s
        return [hours, minutes, seconds]

    def printPrettyTime(self, s: float):
        hours, minutes, seconds = self.prettyPrintHelper(s)
        string = 'Previous section took {}h {}m {}s.'.format(
            int(hours), int(minutes), float(int(seconds*100))/100)
        print(string)

    def printCurrentTime(self):
        print(datetime.datetime.now())

    def prettyPrintTotal(self, s: float):
        hours, minutes, seconds = self.prettyPrintHelper(s)
        string = 'Entire program took {}h {}m {}s.'.format(
            int(hours), int(minutes), float(int(seconds*100))/100)
        print(string)
