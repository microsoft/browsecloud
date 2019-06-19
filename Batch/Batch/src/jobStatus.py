# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from enum import IntEnum


class JobStatus(IntEnum):
    NotStarted = 0
    PreProcessing = 1
    Training = 2
    Success = 3
    Failure = 4
